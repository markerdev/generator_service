require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { generateFacadeImages } = require('./services/geminiService');
const { sendResultsEmail } = require('./services/emailService');
const { uploadFile, generateV4ReadSignedUrl } = require('./services/storageService');

const app = express();
const port = process.env.PORT || 3001;

// --- CORS Configuration ---
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:8000'
].filter(Boolean);

if (allowedOrigins.length === 0 && process.env.NODE_ENV === 'production') {
    console.error('\x1b[31m%s\x1b[0m', 'FATAL: FRONTEND_URL environment variable is not set in production. CORS will block all requests.');
} else {
    console.log('Allowed CORS origins:', allowedOrigins);
}

const corsOptions = {
  origin: allowedOrigins,
  methods: 'POST',
  allowedHeaders: 'Content-Type',
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Multer setup for handling file uploads in memory
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const uploadFields = [
    { name: 'facadeImage', maxCount: 1 },
    { name: 'balconyImage', maxCount: 1 }
];

app.post('/generate-images', upload.fields(uploadFields), async (req, res) => {
    console.log('Received request for /generate-images');

    if (!req.files || !req.files.facadeImage) {
        return res.status(400).json({ message: 'Facade image is required.' });
    }

    try {
        const facadeImageFile = req.files.facadeImage[0];
        const balconyImageFile = req.files.balconyImage ? req.files.balconyImage[0] : null;

        const facadeBase64 = facadeImageFile.buffer.toString('base64');
        const balconyBase64 = balconyImageFile ? balconyImageFile.buffer.toString('base64') : null;

        // Extract user data and modernization options from the request body
        const {
            email,
            firstName,
            lastName,
            housingCompany,
            phoneNumber,
            modernizationChoices: modernizationChoicesJson,
            facadeColor,
            railingMaterial
        } = req.body;
        
        const modernizationOptions = JSON.parse(modernizationChoicesJson || '[]');

        const userData = { firstName, lastName, email, housingCompany, phoneNumber };

        console.log('Calling Gemini API to generate images...');
        const { glazedImage, modernizedImage, cozyBalconyImage } = await generateFacadeImages(
            facadeBase64,
            facadeImageFile.mimetype,
            modernizationOptions,
            facadeColor,
            railingMaterial,
            balconyBase64,
            balconyImageFile ? balconyImageFile.mimetype : null
        );
        console.log('Images generated successfully.');

        // Unique filenames for storage
        const timestamp = Date.now();
        const fileIdentifier = `${email.split('@')[0]}-${timestamp}`;

        const uploadPromises = [];
        const filenames = [];

        if (glazedImage) {
            const filename = `glazed-${fileIdentifier}.png`;
            uploadPromises.push(uploadFile(Buffer.from(glazedImage, 'base64'), filename));
            filenames.push(filename);
        }
        if (modernizedImage) {
            const filename = `modernized-${fileIdentifier}.png`;
            uploadPromises.push(uploadFile(Buffer.from(modernizedImage, 'base64'), filename));
            filenames.push(filename);
        }
        if (cozyBalconyImage) {
            const filename = `cozy-${fileIdentifier}.png`;
            uploadPromises.push(uploadFile(Buffer.from(cozyBalconyImage, 'base64'), filename));
            filenames.push(filename);
        }

        console.log('Uploading images to cloud storage...');
        await Promise.all(uploadPromises);
        console.log('Images uploaded successfully.');
        
        console.log('Generating signed URLs for images...');
        const downloadUrlPromises = filenames.map(filename => generateV4ReadSignedUrl(filename));
        const downloadUrls = await Promise.all(downloadUrlPromises);
        console.log('Signed URLs generated.');
        
        // --- Send Email ---
        // We trigger the email sending but don't wait for it to complete
        // to ensure a fast response to the user. Errors are logged on the server.
        console.log('Initiating email sending...');
        sendResultsEmail(email, downloadUrls, userData)
            .then(() => console.log(`Email process initiated for ${email}.`))
            .catch(err => console.error(`Failed to send email for ${email}:`, err));

        // Respond to the client immediately with the URLs
        res.status(200).json({ urls: downloadUrls });

    } catch (error) {
        console.error('Error during image processing:', error);
        res.status(500).json({ message: error.message || 'An internal server error occurred.' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});