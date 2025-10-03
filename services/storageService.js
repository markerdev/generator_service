const { Storage } = require('@google-cloud/storage');

// TÄRKEÄÄ: Varmista, että Google Cloud -tunnistetiedot on määritetty ympäristössäsi.
// Esim. asettamalla GOOGLE_APPLICATION_CREDENTIALS-ympäristömuuttuja.
const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;

if (!bucketName) {
    throw new Error("GCS_BUCKET_NAME environment variable not set");
}

/**
 * Uploads a file buffer to Google Cloud Storage.
 * @param {Buffer} buffer The file buffer to upload.
 * @param {string} destination The destination path in the bucket.
 * @returns {Promise<string>} The destination path of the uploaded file.
 */
async function uploadFile(buffer, destination) {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(destination);

  await file.save(buffer);
  
  console.log(`${destination} uploaded to ${bucketName}.`);
  return destination;
}

/**
 * Generates a signed URL for reading a file from Google Cloud Storage.
 * The URL is valid for 1 hour.
 * @param {string} fileName The name of the file in the bucket.
 * @returns {Promise<string>} The signed URL.
 */
async function generateV4ReadSignedUrl(fileName) {
  const options = {
    version: 'v4',
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  };

  const [url] = await storage
    .bucket(bucketName)
    .file(fileName)
    .getSignedUrl(options);

  return url;
}

module.exports = { uploadFile, generateV4ReadSignedUrl };
