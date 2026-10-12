# 🎙️ SpeechCraft Studio

**SpeechCraft Studio** is a professional, high-performance web application for General American English (GenAm) speech training, accent reduction, executive verbal delivery, spontaneous conversational coaching, and conversation intelligence. Powered by Google Gemini AI models, it delivers real-time acoustic analysis, phonetic scoring, filler control, and instant reference audio playback.

---

## 🌟 Key Features & Modules

- **Acoustic Speech Analysis & Pronunciation Lab**: Direct audio processing evaluating Words Per Minute (WPM), filler sound detection (`um`, `uh`, `like`), clarity, articulation, rhotic R, and intervocalic flap T.
- **Configurable Gemini AI Models**: Supports selecting between verified Gemini Flash models (*Gemini 3.5 Flash Lite*, *Gemini 3.8 Flash*, *Gemini 3.7 Flash*, *Gemini 3.6 Flash*, *Gemini 3.5 Flash*, and *Gemini 3.1 Flash Lite*).
- **Voice & Delivery & Fluency Gym**: Targeted exercises for rhythm, stress, intonation, connected speech, pauses, and fluency drills.
- **Vocabulary Builder & American Idioms**: Deep word lessons, root word enrichments, word family trees, and idiom mastery.
- **Compliment Craft & Edgy & Adult Studio**: Nuanced social phrasing, playful banter, flirting studio, and edge training.
- **Real-World Conversation Simulator**: Multi-turn American English conversations with dynamic persona adaptation.
- **Practice Aloud (Universal)**: One-click practice integration from any curriculum lesson, vocabulary word, compliment, idiom, or roleplay session.
- **Adaptive Learning & Conversation Intelligence**: Analyzes actual practice history and recurring conversational habits to recommend targeted remediation drills.
- **Privacy First**: Audio recordings remain in browser memory and are analyzed on demand via secure server-side API proxy calls or Cloudflare Worker endpoints.

---

## 📋 Prerequisites

Before deploying or running locally, make sure you have:
1. **Node.js** (v18 or higher) & `npm` installed locally.
2. **Google Gemini API Key** (obtainable free from [Google AI Studio](https://aistudio.google.com/)).
3. **Wrangler CLI** (optional, for deploying Cloudflare Workers).

---

## 💻 Local Development Setup

To run SpeechCraft Studio locally:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the root directory (referencing `.env.example`):
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   PORT=3000
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser. The app runs a full-stack Express + Vite server with server-side Gemini API proxy endpoints.

---

## 🚀 Production Deployment: Frontend + Cloudflare Worker

SpeechCraft Studio supports deploying the static frontend (to Cloudflare Pages or GitHub Pages) with a separate **Cloudflare Worker** handling secure Gemini API requests.

### 1. Deploying the Cloudflare Worker Backend
1. Install Wrangler CLI globally (if not installed):
   ```bash
   npm install -g wrangler
   ```
2. Log in to your Cloudflare account:
   ```bash
   wrangler login
   ```
3. Set your Gemini API key secret in Cloudflare:
   ```bash
   wrangler secret put GEMINI_API_KEY
   ```
4. Deploy the worker (`worker/index.ts`):
   ```bash
   wrangler deploy
   ```
   Note your worker URL (e.g. `https://speechcraft-worker.yourname.workers.dev`).

### 2. Deploying the Frontend (Cloudflare Pages or GitHub Pages)
1. Build the production frontend bundle:
   ```bash
   npm run build
   ```
2. Set `VITE_API_BASE_URL` to point to your deployed Cloudflare Worker URL in your hosting environment variables.
3. Deploy the `dist/` directory to Cloudflare Pages or GitHub Pages.

---

## 📄 License

MIT License. Built for SpeechCraft Studio.
