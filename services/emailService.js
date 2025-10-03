
const API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'no-reply@ai-generator.com';
const SENDER_NAME = "AI Balcony Generator";

/**
 * Sends an email using the Brevo API with download links for the generated images.
 * This method uses a direct HTTP API call, which is not blocked by cloud providers.
 * @param {string} toEmail The recipient's email address.
 * @param {string[]} downloadUrls An array of URLs for the images.
 */
async function sendResultsEmail(toEmail, downloadUrls) {
    if (!API_KEY) {
        console.error('BREVO_API_KEY is not set. Cannot send email.');
        // In a real scenario, you might want to log this to a monitoring service.
        // For development, we can just print the URLs to the console.
        console.log(`--- DEV ONLY: Email not sent. Image URLs for ${toEmail} ---`);
        console.log(downloadUrls.join('\n'));
        console.log('---------------------------------------------------------');
        // We throw an error to indicate failure in production.
        if (process.env.NODE_ENV === 'production') {
             throw new Error('Email service is not configured.');
        }
        return;
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
        // Use inline style for better email client compatibility
        htmlBody += `
            <li style="margin-bottom: 20px;">
                <strong style="display: block; margin-bottom: 5px;">${imageName}</strong>
                <a href="${url}" target="_blank">
                    <img src="${url}" alt="${imageName}" style="max-width: 400px; height: auto; border: 1px solid #ddd; border-radius: 4px;">
                </a>
                <br>
                <a href="${url}" target="_blank" style="font-size: 14px;">View full size</a>
            </li>`;
    });

    htmlBody += '</ul><p>Best regards,<br/>The AI Balcony Glazing Team</p>';

    const payload = {
        sender: {
            name: SENDER_NAME,
            email: SENDER_EMAIL,
        },
        to: [{
            email: toEmail,
        }],
        subject: 'Your Generated Balcony Images',
        htmlContent: htmlBody,
    };

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'api-key': API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error('Brevo API Error:', errorBody);
            throw new Error(`Failed to send email via Brevo API. Status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Email sent successfully to ${toEmail}. Message ID: ${data.messageId}`);

    } catch (error) {
        console.error('Error sending email via Brevo:', error);
        throw new Error('Failed to send results email.');
    }
}

module.exports = { sendResultsEmail };
