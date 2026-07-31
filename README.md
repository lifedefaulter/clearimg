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

Production runs as a Hostinger Node.js application for `clearimg.net`. Pushing
`main` to `origin` triggers Hostinger's connected-repository build and atomic
release switch. Keep `CLEARIMG_API_URL` and `CLEARIMG_API_KEY` configured in
the Hostinger application environment.

After a deploy, verify both layers:

- `https://api.clearimg.net/health` reports the expected API version and model.
- A request through `https://clearimg.net/api/remove-background` succeeds; the
  streamed proxy release identifies itself with `X-ClearImg-Proxy-Version`.
