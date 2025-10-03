const nodemailer = require('nodemailer');

// A single transporter instance can be reused for the app's lifetime.
let transporter;

// This function initializes the transporter. It's designed to be called once.
async function initializeTransporter() {
    // Production configuration: Use Gmail if credentials are provided in environment variables.
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        console.log('Production email environment variables found. Configuring Gmail transporter...');
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                // IMPORTANT: Use a Google App Password here, not your regular password!
                pass: process.env.EMAIL_PASS,
            },
        });
        console.log('Gmail transporter configured successfully.');
    } 
    // Development configuration: Fallback to a test account using Ethereal.
    else {
        console.log('No production email credentials. Creating a Nodemailer test account for development...');
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
        console.log('Ethereal test transporter configured.');
    }
}

/**
 * Sends an email with download links for the generated images.
 * It ensures the transporter is initialized before trying to send an email.
 * @param {string} toEmail The recipient's email address.
 * @param {string[]} downloadUrls An array of URLs for the images.
 */
async function sendResultsEmail(toEmail, downloadUrls) {
    // Initialize the transporter if it hasn't been already.
    if (!transporter) {
        await initializeTransporter();
    }

    let htmlBody = `
        <h1>Your AI Balcony Glazing Proposals are Ready!</h1>
        <p>Thank you for using our service. You can view your generated images using the links below.</p>
        <ul>
    `;
  
    downloadUrls.forEach(url => {
        let imageName = "Generated Image";
        if (url.includes('glazed')) imageName = "Proposal 1: Facade with New Glazings";
        if (url.includes('modernized')) imageName = "Proposal 2: Modernized Facade";
        if (url.includes('cozy')) imageName = "Proposal 3: Cozy Balcony Atmosphere";
        // Use an inline style for better email client compatibility
        htmlBody += `
            <li style="margin-bottom: 20px;">
                <strong style="display: block; margin-bottom: 5px;">${imageName}</strong>
                <a href="${url}">
                    <img src="${url}" alt="${imageName}" style="max-width: 400px; height: auto; border: 1px solid #ddd; border-radius: 4px;">
                </a>
                <br>
                <a href="${url}" style="font-size: 14px;">View full size</a>
            </li>`;
    });

    htmlBody += '</ul><p>Best regards,<br/>The AI Balcony Glazing Team</p>';

    const mailOptions = {
        from: `"AI Generator" <${process.env.EMAIL_USER || 'no-reply@example.com'}>`,
        to: toEmail,
        subject: 'Your Generated Balcony Images',
        html: htmlBody,
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);

        // If using Ethereal, log the preview URL.
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log('Email sent successfully! You can preview it here: %s', previewUrl);
        } else {
            console.log(`Email sent successfully to ${toEmail}`);
        }
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send results email.');
    }
}

module.exports = { sendResultsEmail };