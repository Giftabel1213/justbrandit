# JustBrandIt

A single-app visitor management system with optional face capture and Cloudinary image upload.

## Run locally

```bash
npm install
npm start
```

Then open:

```text
http://localhost:3000
```

## Environment variables

Create a root `.env` file:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
UPLOAD_AUTH_TOKEN=your_secret_token
PORT=3000
```

If you want to disable the upload token for local testing only, leave `UPLOAD_AUTH_TOKEN` blank.

## Deploy

This is a monolith app, so deploy the whole repo as one project. Vercel, Render, or Railway can run the root `server.js` and serve `index.html` automatically.

## Notes

- Do not commit `.env` files.
- Keep `UPLOAD_AUTH_TOKEN` secret.
- The app uses the same origin for uploads by default in `script.js`.
