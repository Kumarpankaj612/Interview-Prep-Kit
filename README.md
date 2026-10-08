# Interview Prep Kit (Dossier)

A single-page web app that builds a personalized interview prep kit. Upload (or paste) a candidate's resume and a job description, and it generates likely **screening**, **behavioral**, and **technical** interview questions, each with a "why they ask" explanation and a prep tip.

## Features

- Upload **PDF, DOCX, or TXT** files, or paste text directly
- Resume and job description are cross-referenced to tailor the questions
- 15 questions each for screening, behavioral, and technical rounds
- Flip-card UI: question on the front, rationale and prep tip on the back
- Export as **PDF**, **print**, or **copy as text**
- Runs entirely in the browser, nothing is stored

## Tech

- HTML, CSS, vanilla JavaScript (single file: `index.html`)
- [pdf.js](https://mozilla.github.io/pdf.js/) for reading PDFs
- [mammoth.js](https://github.com/mwilliamjohnston/mammoth.js) for reading DOCX
- [jsPDF](https://github.com/parallax/jsPDF) for PDF export
- Google Fonts: Fraunces, Inter, IBM Plex Mono

## Usage

1. Open `index.html` in a browser (or visit the GitHub Pages link once enabled).
2. Add a resume and a job description.
3. Click **Compile prep kit**.
4. Flip cards to see why each question is asked, then export if you like.

## Important note on question generation

The question generation calls `claude.use("sample")` and PDF saving calls `claude.use("downloads")`. These are provided by the Claude artifact runtime, so **question generation and PDF download only work when the page is run inside Claude** (as a published artifact). Upload, paste, text extraction, flip cards, print, and copy work anywhere, but on GitHub Pages or locally the "Compile prep kit" step will show an error.

To run it standalone, replace `callClaude()` in `index.html` with a call to an LLM API of your choice (use a small backend/proxy so you never expose an API key in front-end code), and replace the PDF save with `doc.save(filename)`.

## Deploy with GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
4. Your site will appear at `https://<your-username>.github.io/<repo-name>/`.

## License

MIT
