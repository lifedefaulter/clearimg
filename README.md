# ClearImg.net

Sharp server-side background removal — web demo + API proxy for PDFMingo integration.

## Quick start

```bash
cd clearimg-app
npm install
cp .env.example .env.local
# Set CLEARIMG_API_URL to your background removal server endpoint
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `CLEARIMG_API_URL` | Yes (for processing) | Your server endpoint, e.g. `https://api.clearimg.net/v1/remove-background` |
| `CLEARIMG_API_KEY` | No | Bearer token sent to your backend |

## API proxy

The Next.js route `POST /api/remove-background` accepts multipart uploads from the browser and forwards them to your server. This keeps API keys off the client and matches the contract PDFMingo will use.

## Project structure

```
clearimg-app/src/
├── app/              # Pages + API routes
├── components/       # UI components
└── lib/              # Types, validation, client API helper
```

## Deploy

Deploy to Vercel (or similar) with `CLEARIMG_API_URL` and `CLEARIMG_API_KEY` set in project environment variables.
