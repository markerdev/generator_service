
const nodemailer = require('nodemailer');

let transporter;

// This function creates a test transporter using Ethereal for development.
// It creates a single test account and reuses the transporter instance.
async function getTestTransporter() {
    if (transporter) {
        return transporter;
    }

    console.log('Creating a Nodemailer test account for development...');
    const testAccount = await nodemailer.createTestAccount();
    console.log('Test account created:', testAccount.user);

    transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: testAccount.user, // generated ethereal user
            pass: testAccount.pass, // generated ethereal password
        },
    });

    return transporter;
}

/**
 * Sends an email with download links for the generated images.
 * @param {string} toEmail The recipient's email address.
 * @param {string[]} downloadUrls An array of URLs for the images.
 */
async function sendResultsEmail(toEmail, downloadUrls) {
  const mailTransporter = await getTestTransporter();

  let htmlBody = `
    <h1>Your AI Balcony Glazing Proposals are Ready!</h1>
    <p>Thank you for using our service. You can view your generated images using the links below.</p>
    <p><strong>Note:</strong> These images are hosted for development purposes. In a production environment, these would be persistent links.</p>
    <ul>
  `;
  
  downloadUrls.forEach(url => {
    let imageName = "Generated Image";
    if (url.includes('glazed')) imageName = "Proposal 1: Facade with New Glazings";
    if (url.includes('modernized')) imageName = "Proposal 2: Modernized Facade";
    if (url.includes('cozy')) imageName = "Proposal 3: Cozy Balcony Atmosphere";
    htmlBody += `<li><a href="${url}">${imageName}</a></li>`;
  });

  htmlBody += '</ul><p>Best regards,<br/>The AI Balcony Glazing Team</p>';

  const mailOptions = {
    from: `"AI Generator" <no-reply@example.com>`,
    to: toEmail,
    subject: 'Your Generated Balcony Images',
    html: htmlBody,
  };

  try {
    let info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    // Log the Ethereal preview URL to the console
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log('Email sent successfully! You can preview it here: %s', previewUrl);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send results email.');
  }
}

module.exports = { sendResultsEmail };
