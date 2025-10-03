
const nodemailer = require('nodemailer');

// --- Production Email Configuration ---
// These variables must be set in your cPanel Node.js App environment.
const smtpConfig = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
};

if (!smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
    console.error("!!! FATAL: SMTP environment variables not set. Email will not be sent.");
}

/**
 * Sends an email with download links for the generated images using production SMTP credentials.
 * @param {string} toEmail The recipient's email address.
 * @param {string[]} downloadUrls An array of URLs for the images.
 */
async function sendResultsEmail(toEmail, downloadUrls) {
  if (!smtpConfig.host) {
    console.error("Skipping email send because SMTP is not configured.");
    return;
  }
  
  const transporter = nodemailer.createTransport(smtpConfig);

  let htmlBody = `
    <h1>Your AI Balcony Glazing Proposals are Ready!</h1>
    <p>Thank you for using our service. You can view and download your generated images using the links below.</p>
    <ul>
  `;
  
  downloadUrls.forEach((url, index) => {
    let imageName = '';
    if (url.includes('glazed')) imageName = 'Image 1: Glazed Balconies';
    else if (url.includes('modernized')) imageName = 'Image 2: Modernized Facade';
    else if (url.includes('cozy')) imageName = 'Image 3: Cozy Balcony Atmosphere';
    else imageName = `Image ${index + 1}`;
    
    htmlBody += `<li><a href="${url}">${imageName}</a></li>`;
  });

  htmlBody += '</ul><p>Best regards,<br/>The AI Balcony Glazing Team</p>';

  const mailOptions = {
    from: `"AI Generator" <${process.env.SMTP_USER}>`, // Use your sending email address
    to: toEmail,
    subject: 'Your Generated Balcony Images',
    html: htmlBody,
  };

  try {
    let info = await transporter.sendMail(mailOptions);
    console.log('Message sent successfully to %s: %s', toEmail, info.messageId);

  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send results email.');
  }
}

module.exports = { sendResultsEmail };
