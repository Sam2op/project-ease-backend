const SibApiV3Sdk = require('@sendinblue/client');

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

exports.sendEmail = async ({ email, subject, message }) => {
  try {
    console.log('=== BREVO EMAIL ===');
    console.log('Sending to:', email);
    
    const sendSmtpEmail = {
      to: [{
        email: email,
        name: email.split('@')[0]
      }],
      sender: {
        email: process.env.EMAIL_FROM || 'noreply@projectease.com',
        name: 'ProjectEase'
      },
      subject: subject,
      textContent: message,
    };

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Brevo email sent successfully:', result.messageId);
    return result;
    
  } catch (error) {
    console.error('❌ Brevo error:', error);
    throw error;
  }
};
