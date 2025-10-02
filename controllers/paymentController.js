const Razorpay = require('razorpay');
const crypto = require('crypto');
const Request = require('../models/Request');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc   Create Razorpay Order
// @route  POST /api/payments/create-order
// @access Private
const createRazorpayOrder = async (req, res) => {
  try {
    console.log('=== CREATING RAZORPAY ORDER ===');
    const { requestId, paymentType } = req.body;
    
    const request = await Request.findById(requestId).populate('project user');
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    console.log('Found request:', {
      id: request._id,
      status: request.status,
      totalAmount: request.totalAmount,
      actualPrice: request.actualPrice,
      estimatedPrice: request.estimatedPrice
    });

    // Check authorization
    const isOwner = request.user && request.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to make payment for this request'
      });
    }

    // Calculate payment amount
    let paymentAmount = 0;
    const baseAmount = request.actualPrice || request.estimatedPrice || request.totalAmount || 0;
    
    console.log('Base amount for calculation:', baseAmount);
    
    if (baseAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Project price not set. Please contact admin to set the project price first.'
      });
    }
    
    switch (paymentType) {
      case 'advance':
        paymentAmount = Math.round(baseAmount * 0.7);
        break;
      case 'full':
        paymentAmount = baseAmount;
        break;
      case 'remaining':
        const totalPaid = request.payments
          ? request.payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0)
          : 0;
        paymentAmount = baseAmount - totalPaid;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid payment type'
        });
    }

    console.log('Calculated payment amount:', paymentAmount);

    if (paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment amount calculated'
      });
    }

    // Generate unique payment ID
    const paymentId = crypto.randomBytes(16).toString('hex');
    const projectName = request.project?.name || request.customProject?.name || 'Custom Project';

    // Create Razorpay order
    const orderOptions = {
      amount: paymentAmount * 100, // Razorpay expects amount in paise
      currency: 'INR',
      receipt: paymentId,
      notes: {
        requestId: request._id.toString(),
        paymentType: paymentType,
        projectName: projectName,
        userId: request.user._id.toString(),
        paymentId: paymentId
      }
    };

    console.log('Creating Razorpay order with options:', orderOptions);

    const razorpayOrder = await razorpay.orders.create(orderOptions);

    console.log('Razorpay order created:', razorpayOrder);

    // Create payment record in database
    const paymentRecord = {
      paymentId,
      razorpayOrderId: razorpayOrder.id,
      amount: paymentAmount,
      type: paymentType,
      status: 'pending',
      method: 'razorpay',
      createdAt: new Date()
    };

    // Initialize payments array if it doesn't exist
    if (!request.payments) {
      request.payments = [];
    }

    // Add payment record to request
    request.payments.push(paymentRecord);
    await request.save();

    console.log('Payment record saved to database');

    res.status(200).json({
      success: true,
      orderId: razorpayOrder.id,
      amount: paymentAmount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID,
      paymentId: paymentId,
      projectName: projectName,
      userName: request.user?.username || 'User'
    });

  } catch (error) {
    console.error('❌ Razorpay Order Creation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order: ' + error.message
    });
  }
};

// @desc   Verify Razorpay Payment
// @route  POST /api/payments/verify
// @access Private
const verifyRazorpayPayment = async (req, res) => {
  try {
    console.log('=== VERIFYING RAZORPAY PAYMENT ===');
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    console.log('Payment verification data:', {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature
    });

    // Verify signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      console.log('❌ Signature verification failed');
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed - Invalid signature'
      });
    }

    console.log('✅ Signature verified successfully');

    // Find the request with this order
    const request = await Request.findOne({
      'payments.razorpayOrderId': razorpay_order_id
    }).populate('user project');

    if (!request) {
      console.log('❌ Request not found for order:', razorpay_order_id);
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    console.log('Found request:', request._id);

    // Update payment status
    const paymentIndex = request.payments.findIndex(p => p.razorpayOrderId === razorpay_order_id);
    
    if (paymentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found in request'
      });
    }

    const payment = request.payments[paymentIndex];

    if (payment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed'
      });
    }

    // Mark payment as completed
    request.payments[paymentIndex].status = 'completed';
    request.payments[paymentIndex].razorpayPaymentId = razorpay_payment_id;
    request.payments[paymentIndex].razorpaySignature = razorpay_signature;
    request.payments[paymentIndex].paidAt = new Date();

    // Update overall payment status
    const baseAmount = request.actualPrice || request.estimatedPrice || request.totalAmount || 0;
    const totalPaid = request.payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid >= baseAmount) {
      request.paymentStatus = 'completed';
    } else if (totalPaid > 0) {
      request.paymentStatus = 'partial';
    }

    await request.save();

    console.log('✅ Payment status updated successfully');

    // Send notification email (optional)
    await sendPaymentConfirmationEmail(request, payment);

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      paymentStatus: request.paymentStatus,
      paidAmount: payment.amount
    });

  } catch (error) {
    console.error('❌ Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed: ' + error.message
    });
  }
};

// @desc   Razorpay Webhook Handler (Automatic Payment Detection)
// @route  POST /api/payments/webhook
// @access Public (Webhook)
const handleRazorpayWebhook = async (req, res) => {
  try {
    console.log('=== RAZORPAY WEBHOOK RECEIVED ===');
    
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookBody = JSON.stringify(req.body);

    console.log('Webhook event:', req.body.event);
    console.log('Webhook payload:', req.body.payload);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(webhookBody)
      .digest('hex');

    if (webhookSignature !== expectedSignature) {
      console.log('❌ Webhook signature verification failed');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    console.log('✅ Webhook signature verified');

    const { event, payload } = req.body;

    // Handle payment.captured event (when payment is successful)
    if (event === 'payment.captured') {
      const payment = payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;

      console.log('Payment captured:', { orderId, paymentId, amount: payment.amount });

      // Find request with this order
      const request = await Request.findOne({
        'payments.razorpayOrderId': orderId
      }).populate('user project');

      if (request) {
        // Update payment status automatically
        const paymentIndex = request.payments.findIndex(p => p.razorpayOrderId === orderId);
        
        if (paymentIndex !== -1 && request.payments[paymentIndex].status === 'pending') {
          request.payments[paymentIndex].status = 'completed';
          request.payments[paymentIndex].razorpayPaymentId = paymentId;
          request.payments[paymentIndex].paidAt = new Date();
          request.payments[paymentIndex].webhookProcessed = true;

          // Update overall payment status
          const baseAmount = request.actualPrice || request.estimatedPrice || request.totalAmount || 0;
          const totalPaid = request.payments
            .filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + p.amount, 0);

          if (totalPaid >= baseAmount) {
            request.paymentStatus = 'completed';
          } else if (totalPaid > 0) {
            request.paymentStatus = 'partial';
          }

          await request.save();

          console.log('✅ Payment automatically updated via webhook');

          // Send confirmation email
          await sendPaymentConfirmationEmail(request, request.payments[paymentIndex]);
        }
      }
    }

    // Handle payment.failed event
    if (event === 'payment.failed') {
      const payment = payload.payment.entity;
      const orderId = payment.order_id;

      console.log('Payment failed:', { orderId, reason: payment.error_description });

      // Find and update payment status
      const request = await Request.findOne({
        'payments.razorpayOrderId': orderId
      });

      if (request) {
        const paymentIndex = request.payments.findIndex(p => p.razorpayOrderId === orderId);
        if (paymentIndex !== -1) {
          request.payments[paymentIndex].status = 'failed';
          request.payments[paymentIndex].failureReason = payment.error_description;
          await request.save();

          console.log('Payment marked as failed via webhook');
        }
      }
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ success: false });
  }
};

// @desc   Get Payment Status
// @route  GET /api/payments/status/:paymentId
// @access Private
const getPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const request = await Request.findOne({
      'payments.paymentId': paymentId
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const payment = request.payments.find(p => p.paymentId === paymentId);

    res.status(200).json({
      success: true,
      payment: {
        paymentId: payment.paymentId,
        status: payment.status,
        amount: payment.amount,
        type: payment.type,
        paidAt: payment.paidAt,
        razorpayPaymentId: payment.razorpayPaymentId
      }
    });
  } catch (error) {
    console.error('Payment Status Check Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status'
    });
  }
};

// Helper function to send payment confirmation email
const sendPaymentConfirmationEmail = async (request, payment) => {
  try {
    const { sendEmail } = require('../utils/sendEmail');
    const userEmail = request.user?.email || request.guestInfo?.email;
    const userName = request.user?.username || request.guestInfo?.name;
    const projectName = request.project?.name || request.customProject?.name;

    if (userEmail) {
      const emailMessage = `
Hi ${userName},

Great news! Your payment has been confirmed successfully.

Payment Details:
• Project: ${projectName}
• Amount Paid: ₹${payment.amount}
• Payment Type: ${payment.type.toUpperCase()}
• Transaction ID: ${payment.razorpayPaymentId}
• Payment Date: ${new Date(payment.paidAt).toLocaleDateString()}

${request.paymentStatus === 'completed' 
  ? 'Your project will begin development shortly. You can track progress in your dashboard.'
  : 'This was a partial payment. You can pay the remaining amount from your dashboard.'
}

Thank you for choosing ProjectEase!

Best regards,
ProjectEase Team
      `;

      await sendEmail({
        email: userEmail,
        subject: `Payment Confirmed - ${projectName}`,
        message: emailMessage
      });

      console.log('✅ Payment confirmation email sent');
    }
  } catch (error) {
    console.error('❌ Failed to send payment confirmation email:', error);
  }
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook,
  getPaymentStatus
};
