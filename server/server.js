require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

const app = express();
app.use(cors());
app.use(express.json({ limit: '12mb' }));

const PORT = process.env.PORT || 3000;

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, UPLOAD_AUTH_TOKEN } = process.env;
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('Missing Cloudinary env variables. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

// Simple health check
app.get('/health', (req, res) => res.json({ ok: true }));

// Upload endpoint: expects JSON { image: 'data:<mime>;base64,...', public_id? }
// Protect with UPLOAD_AUTH_TOKEN header 'x-upload-auth' if set in env
app.post('/upload', async (req, res) => {
  try {
    console.log('[/upload] incoming request headers:', {
      origin: req.headers.origin,
      authHeader: req.headers['x-upload-auth'] || req.headers['authorization'] || null,
      contentType: req.headers['content-type'] || null,
    });
    if (UPLOAD_AUTH_TOKEN) {
      const token = req.headers['x-upload-auth'] || req.headers['authorization'];
      if (!token || (token !== UPLOAD_AUTH_TOKEN && token !== `Bearer ${UPLOAD_AUTH_TOKEN}`)) {
        console.warn('[/upload] unauthorized attempt (token mismatch)');
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const { image, public_id } = req.body;
    if (image) {
      console.log('[/upload] received image payload length:', String(image).length);
    } else {
      console.log('[/upload] no image in request body');
    }
    if (!image) return res.status(400).json({ error: 'No image provided' });

    // Use cloudinary.uploader.upload with data URL
    const options = {};
    if (public_id) options.public_id = public_id;
    const result = await cloudinary.uploader.upload(image, options);
    console.log('[/upload] uploaded to Cloudinary:', { public_id: result.public_id, secure_url: result.secure_url });
    return res.json({ url: result.secure_url, raw: result });
  } catch (err) {
    console.error('Upload error', err);
    return res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Cloudinary upload server running on port ${PORT}`);
});
