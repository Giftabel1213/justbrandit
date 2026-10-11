require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '12mb' }));
app.use(express.static(path.join(__dirname)));

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, UPLOAD_AUTH_TOKEN } = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('Missing Cloudinary env variables. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

app.get('/health', (req, res) => res.json({ ok: true }));

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
    console.log('[/upload] received image payload length:', image ? String(image).length : 0);

    if (!image) return res.status(400).json({ error: 'No image provided' });

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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`JustBrandIt app running on http://localhost:${PORT}`);
});
