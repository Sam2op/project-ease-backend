const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Request = require('../models/Request');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// @desc   Create Razorpay order
// @route  POST /api/payments/create-order
// @access Private
exports.createOrder = async (req, res, next) => {
  try {
    const { requestId, amount } = req.body;

    const options = {
      amount: amount * 100, // paise
      currency: 'INR',
      receipt: `req_${requestId}_${Date.now()}`
    };
    const order = await razorpay.orders.create(options);

    await Payment.create({
      request: requestId,
      user: req.user._id,
      razorpayOrderId: order.id,
      amount,
      paymentType: req.body.paymentType
    });

    res.status(201).json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

// @desc   Verify payment signature
// @route  POST /api/payments/verify
// @access Private
exports.verifyPayment = async (req, res, next) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    const sign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(orderId + '|' + paymentId)
      .digest('hex');

    if (sign !== signature) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    // Mark payment paid
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: orderId },
      { razorpayPaymentId: paymentId, razorpaySignature: signature, status: 'paid' },
      { new: true }
    );

    // Update request payment status (simple demo logic)
    const request = await Request.findById(payment.request);
    request.paymentStatus = 'completed';
    await request.save();

    res.status(200).json({ success: true, payment });
  } catch (err) {
    next(err);
  }
};
