const nodemailer = require('nodemailer');

const transport = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendEmail = async ({ email, subject, message }) => {
  await transport.sendMail({
    from: process.env.EMAIL_FROM || '"ProjectEase" <noreply@projectease.com>',
    to: email,
    subject,
    text: message
  });
};
