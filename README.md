# Interview Prep Kit (Dossier)

A single-page web app that builds a personalized interview prep kit. Upload (or paste) a candidate's resume and a job description, and it generates likely **screening**, **behavioral**, and **technical** interview questions, each with a "why they ask" explanation and a prep tip.

## Features

- Upload **PDF, DOCX, or TXT** files, or paste text directly
- Resume and job description are cross-referenced to tailor the questions
- 15 questions each for screening, behavioral, and technical rounds
- Flip-card UI: question on the front, rationale and prep tip on the back
- Export as **PDF**, **print**, or **copy as text**
- Documents are processed in your browser; only the extracted text is sent to the backend to generate questions

## Architecture

```
index.html          Front-end (single file, no build step)
api/generate.js     Serverless proxy to the Anthropic API (keeps your key private)
```

The browser never sees your API key. `index.html` posts to `/api/generate`, which calls the Anthropic Messages API and returns the text.

(If the page is opened inside Claude as an artifact, it uses Claude's built-in runtime instead and needs no backend.)

## Run locally

Requires Node 18+ and the [Vercel CLI](https://vercel.com/docs/cli).

```bash
npm i -g vercel
cp .env.example .env        # then put your real ANTHROPIC_API_KEY in .env
vercel dev
```

Open the printed local URL (usually http://localhost:3000).

## Deploy (recommended: Vercel, front-end + API together)

1. Push this repo to GitHub.
2. Import the repo at [vercel.com/new](https://vercel.com/new).
3. In **Settings → Environment Variables**, add `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`).
4. Deploy. The app and `/api/generate` are served from the same domain, so nothing else needs configuring.

## Alternative: front-end on GitHub Pages, API on Vercel

GitHub Pages can only host static files, so the API must live elsewhere:

1. Deploy the repo to Vercel as above, and set `ALLOWED_ORIGIN` to `https://<your-username>.github.io`.
2. In `index.html`, set `API_URL` to your full Vercel URL, e.g. `https://my-app.vercel.app/api/generate`.
3. Enable **Settings → Pages → Deploy from a branch → `main` / root** on GitHub.

## Environment variables

| Name | Required | Description |
|------|----------|-------------|
| `ANTHROPIC_API_KEY` | yes | Your Anthropic API key (never commit it) |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-sonnet-5-5` |
| `ALLOWED_ORIGIN` | no | Only needed when the front-end is on a different origin |

## Cost and abuse note

Anyone who can open your deployed site can trigger API calls on your key. Before sharing the link publicly, consider adding rate limiting or authentication, and set a spend limit in your Anthropic console.

## Tech

- HTML, CSS, vanilla JavaScript
- [pdf.js](https://mozilla.github.io/pdf.js/), [mammoth.js](https://github.com/mwilliamjohnston/mammoth.js), [jsPDF](https://github.com/parallax/jsPDF)
- Google Fonts: Fraunces, Inter, IBM Plex Mono

## License

MIT
