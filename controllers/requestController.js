const Request = require('../models/Request');
const Project = require('../models/Project');
const { sendEmail } = require('../utils/sendEmail');

// @desc   Create new project request
// @route  POST /api/requests
// @access Public
exports.createRequest = async (req, res, next) => {
  try {
    const { 
      projectId, 
      customProject, 
      clientType = 'registered',
      guestInfo
    } = req.body;

    let requestData = {
      clientType,
      status: 'pending',
      paymentStatus: 'pending',
      approvalEmailSent: false,
      paymentOption: 'advance'
    };
    
    // Set request type and validate accordingly
    if (projectId) {
      requestData.type = 'existing';
      
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      requestData.project = projectId;
      requestData.estimatedPrice = project.price;
      requestData.totalAmount = project.price;
      requestData.advanceAmount = Math.round(project.price * 0.7);
      requestData.remainingAmount = project.price - requestData.advanceAmount;
      
    } else if (customProject) {
      requestData.type = 'custom';
      
      if (!customProject.name || !customProject.description) {
        return res.status(400).json({
          success: false,
          message: 'Custom project name and description are required'
        });
      }
      
      requestData.customProject = customProject;
      requestData.estimatedPrice = customProject.estimatedPrice || 0;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either project ID or custom project details are required'
      });
    }

    // Set user information
    if (clientType === 'registered') {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required for registered users'
        });
      }
      requestData.user = req.user._id;
    } else {
      if (!guestInfo || !guestInfo.name || !guestInfo.email) {
        return res.status(400).json({
          success: false,
          message: 'Guest information is required'
        });
      }
      requestData.guestInfo = guestInfo;
    }

    const request = await Request.create(requestData);
    
    // Send confirmation email with better debugging
    const userEmail = clientType === 'registered' ? req.user?.email : guestInfo.email;
    const userName = clientType === 'registered' ? req.user?.username : guestInfo.name;
    const projectName = projectId ? 
      (await Project.findById(projectId)).name : 
      customProject.name;

    console.log('=== EMAIL DEBUG INFO ===');
    console.log('User Email:', userEmail);
    console.log('User Name:', userName);
    console.log('Project Name:', projectName);
    console.log('Client Type:', clientType);

    if (userEmail) {
      const emailMessage = `
Hi ${userName},

Thank you for your project request! We've received your submission and our team will review it shortly.

Project Details:
• Name: ${projectName}
• Type: ${requestData.type === 'existing' ? 'Catalog Project' : 'Custom Project'}
• Payment Option: ${
    request.paymentOption === 'advance'
      ? '70% Advance + 30% on Completion'
      : 'Full Payment'
  }
${requestData.estimatedPrice > 0 ? `• Estimated Price: ₹${requestData.estimatedPrice}` : ''}

We'll get back to you within 24 hours with more details and pricing information.

Best regards,
ProjectEase Team
      `;

      console.log('=== ATTEMPTING TO SEND EMAIL ===');
      console.log('Subject:', `Project Request Received - ${projectName}`);
      
      try {
        await sendEmail({
          email: userEmail,
          subject: `Project Request Received - ${projectName}`,
          message: emailMessage
        });
        console.log('✅ EMAIL SENT SUCCESSFULLY');
      } catch (err) {
        console.error('❌ EMAIL SENDING FAILED:', err);
        console.error('Full error details:', err.message);
      }
    } else {
      console.log('❌ NO USER EMAIL FOUND - EMAIL NOT SENT');
    }

    res.status(201).json({
      success: true,
      request
    });
  } catch (error) {
    console.error('❌ CREATE REQUEST ERROR:', error);
    next(error);
  }
};

// @desc   Get user's own requests with full details
// @route  GET /api/requests/my
// @access Private (User)
exports.getUserRequests = async (req, res, next) => {
  try {
    const requests = await Request.find({ user: req.user._id })
      .populate('project', 'name price description technologies category images')
      .populate('statusHistory.updatedBy', 'username')
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (err) { 
    next(err); 
  }
};

// @desc   Get all requests (admin)
// @route  GET /api/requests
// @access Private/Admin
exports.getAllRequests = async (req, res, next) => {
  try {
    const requests = await Request.find()
      .populate('user', 'username email')
      .populate('project', 'name')
      .populate('statusHistory.updatedBy', 'username')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: requests.length, requests });
  } catch (err) {
    next(err);
  }
};

// @desc   Update request status (admin only)
// @route  PUT /api/requests/:id
// @access Private/Admin
exports.updateRequest = async (req, res, next) => {
  try {
    const { status, adminNotes, actualPrice, currentModule, githubLink } = req.body;
    
    console.log('=== UPDATE REQUEST DEBUG ===');
    console.log('Request ID:', req.params.id);
    console.log('New Status:', status);
    console.log('Admin Notes:', adminNotes);
    console.log('Actual Price:', actualPrice);
    
    const request = await Request.findById(req.params.id)
      .populate('user', 'username email')
      .populate('project', 'name');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    console.log('Found Request:', {
      id: request._id,
      currentStatus: request.status,
      approvalEmailSent: request.approvalEmailSent,
      userEmail: request.user?.email,
      guestEmail: request.guestInfo?.email
    });

    const oldStatus = request.status;
    
    // Update request fields
    if (status) request.status = status;
    if (adminNotes) request.adminNotes = adminNotes;
if (actualPrice) {
  request.actualPrice = actualPrice;
  request.totalAmount = actualPrice; // Make sure totalAmount is set
  
  if (request.paymentOption === 'advance') {
    request.advanceAmount = Math.round(actualPrice * 0.7);
    request.remainingAmount = actualPrice - request.advanceAmount;
  } else {
    request.advanceAmount = actualPrice;
    request.remainingAmount = 0;
  }
    console.log('Updated payment amounts:', {
    actualPrice: request.actualPrice,
    totalAmount: request.totalAmount,
    advanceAmount: request.advanceAmount,
    remainingAmount: request.remainingAmount
  });
}
    if (currentModule) request.currentModule = currentModule;
    if (githubLink) request.githubLink = githubLink;

    // Add to status history
    if (status && status !== oldStatus) {
      request.statusHistory.push({
        status,
        timestamp: new Date(),
        notes: adminNotes || `Status changed to ${status}`,
        updatedBy: req.user._id
      });
    }

    await request.save();

    console.log('=== EMAIL DECISION LOGIC ===');
    console.log('Status changed from', oldStatus, 'to', status);
    console.log('Approval email sent?', request.approvalEmailSent);

    // Send appropriate email based on status change
    let emailSubject, emailMessage;
    
    if (status === 'approved' && !request.approvalEmailSent) {
      console.log('🎯 SENDING APPROVAL EMAIL');
      
      emailSubject = `🎉 Your Project "${request.project?.name || request.customProject?.name}" has been Approved!`;
      emailMessage = `
Hi ${request.user?.username || request.guestInfo?.name},

Great news! Your project request has been approved and we're ready to begin development.

Project Details:
• Name: ${request.project?.name || request.customProject?.name}
• Price: ₹${actualPrice || request.estimatedPrice}
• Payment Option: ${request.paymentOption === 'advance' ? '70% Advance + 30% on Completion' : 'Full Payment'}
• Amount to Pay: ₹${request.paymentOption === 'advance' ? request.advanceAmount : request.actualPrice}

${adminNotes ? `Admin Notes: ${adminNotes}` : ''}

Please log in to your dashboard to proceed with the payment and track your project progress.

Best regards,
ProjectEase Team
      `;
      
      // Mark approval email as sent
      request.approvalEmailSent = true;
      await request.save();
      
    } else if (status && status !== oldStatus && request.approvalEmailSent) {
      console.log('🎯 SENDING UPDATE EMAIL');
      
      emailSubject = `📢 Update - ${request.project?.name || request.customProject?.name}`;
      emailMessage = `
Hi ${request.user?.username || request.guestInfo?.name},

We have an update on your project:

Project: ${request.project?.name || request.customProject?.name}
Status: ${status.charAt(0).toUpperCase() + status.slice(1)}
${currentModule ? `Current Module: ${currentModule}` : ''}

${adminNotes ? `Update Details: ${adminNotes}` : ''}

${githubLink ? `GitHub Repository: ${githubLink}` : ''}

You can view detailed progress in your dashboard.

Best regards,
ProjectEase Team
      `;
    } else if (adminNotes && !status) {
      console.log('🎯 SENDING NOTES UPDATE EMAIL');
      
      emailSubject = `📝 Update - ${request.project?.name || request.customProject?.name}`;
      emailMessage = `
Hi ${request.user?.username || request.guestInfo?.name},

New update on your project:

Project: ${request.project?.name || request.customProject?.name}
Update: ${adminNotes}

${currentModule ? `Current Module: ${currentModule}` : ''}
${githubLink ? `GitHub Repository: ${githubLink}` : ''}

Best regards,
ProjectEase Team
      `;
    }

    // Send email if we have a message
    if (emailMessage) {
      const userEmail = request.user?.email || request.guestInfo?.email;
      
      console.log('=== SENDING UPDATE EMAIL ===');
      console.log('Email to:', userEmail);
      console.log('Subject:', emailSubject);
      
      if (userEmail) {
        try {
          await sendEmail({
            email: userEmail,
            subject: emailSubject,
            message: emailMessage
          });
          console.log('✅ UPDATE EMAIL SENT SUCCESSFULLY');
        } catch (err) {
          console.error('❌ UPDATE EMAIL SENDING FAILED:', err);
          console.error('Full error details:', err.message);
        }
      } else {
        console.log('❌ NO USER EMAIL FOUND FOR UPDATE EMAIL');
      }
    } else {
      console.log('ℹ️ NO EMAIL MESSAGE TO SEND');
    }

    res.status(200).json({
      success: true,
      request
    });
  } catch (error) {
    console.error('❌ UPDATE REQUEST ERROR:', error);
    next(error);
  }
};

// @desc   Update payment option for approved request
// @route  PUT /api/requests/:id/payment-option
// @access Private (User)
exports.updatePaymentOption = async (req, res, next) => {
  try {
    const { paymentOption } = req.body;
    
    if (!['advance', 'full'].includes(paymentOption)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment option'
      });
    }

    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Can only select payment option for approved projects'
      });
    }

    request.paymentOption = paymentOption;
    const price = request.actualPrice || request.estimatedPrice;
    
    if (paymentOption === 'advance') {
      request.advanceAmount = Math.round(price * 0.7);
      request.remainingAmount = price - request.advanceAmount;
    } else {
      request.advanceAmount = price;
      request.remainingAmount = 0;
    }

    request.totalAmount = price;
    await request.save();

    res.status(200).json({
      success: true,
      request
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get request by ID
// @route  GET /api/requests/:id
// @access Private
exports.getRequestById = async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('project')
      .populate('user', 'username email')
      .populate('statusHistory.updatedBy', 'username');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    const isOwner = request.user && request.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    res.status(200).json({
      success: true,
      request
    });
  } catch (error) {
    next(error);
  }
};
