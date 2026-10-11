Cloudinary server upload (minimal guide)

1. Install server deps

```bash
cd server
npm install
```

2. Create `.env` in `server/` based on `.env.example` and set:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `UPLOAD_AUTH_TOKEN` (recommended)

3. Start server

```bash
npm start
```

4. Configure client

- Open `script.js` and set `UPLOAD_SERVER_URL` to your server address, e.g. `http://localhost:3000`.
- If you set `UPLOAD_AUTH_TOKEN` in the server, set the same value in `script.js` variable `UPLOAD_AUTH_TOKEN`.

Security note: keep `CLOUDINARY_API_SECRET` only on the server. Do not place API secret/token in client code for production.
