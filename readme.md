# 🎬 AI Video Composer

[![Live Site](https://img.shields.io/badge/Live-Demo-brightgreen?style=for-the-badge&logo=vercel)](https://aivideocomposer.vercel.app/)
[![YouTube Demo](https://img.shields.io/badge/YouTube-Watch-red?style=for-the-badge&logo=youtube)](https://youtu.be/EG9IYzk9wSg)

**AI Video Composer** is a high-performance, AI-driven cinematic orchestration platform. It transforms simple prompts into fully-realized video compositions, complete with synchronized visuals, HTML-based motion graphics, voiceovers, and background music.

---

## 📺 Demo Video
Check out the AI Video Composer in action:
[![Watch the video](https://img.youtube.com/vi/EG9IYzk9wSg/maxresdefault.jpg)](https://youtu.be/EG9IYzk9wSg)

---

## ✨ Key Features

- **🤖 AI Director**: Uses specialized LLM prompts to orchestrate cinematic narratives.
- **🎨 Dynamic HTML Overlays**: Real-time rendering of complex CSS layouts, split-screens, and motion typography.
- **🎙️ Seamless Voiceovers**: Integrated ElevenLabs TTS with precise scene synchronization.
- **🖼️ Automated Media Sourcing**: Intelligent search and retrieval from Pexels (video/image) and Openverse (audio).
- **⚙️ Pro-Grade Composition Engine**: Sequential narrative rotation, hardware-accelerated frame rendering, and MP4 muxing.
- **📱 Responsive Layouts**: Automatically adapts between 16:9 (Horizontal) and 9:16 (Vertical/Shorts) aspect ratios.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Vanilla CSS, Framer Motion (for animations)
- **AI/Backend**: Vercel Edge Functions, AI SDK
- **Media**: Pexels API, Openverse API
- **Audio**: ElevenLabs SDK
- **Export**: mp4-muxer, WebCodecs

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/jeevanandmaurya/aivideocomposer.git
cd aivideocomposer
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables
Create a `.env.local` file in the root directory and add the following keys:

```env
# Required for Video/Image Assets
VITE_PEXELS_API_KEY=your_pexels_api_key

# Required for Voiceovers
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Required for AI Generation (via Ollama)
OLLAMA_API_KEY=your_ollama_api_key

# Optional: AI Backup Providers
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_NVIDIA_NIM_API_KEY=your_nvidia_nim_api_key
```

### 4. Run the Development Server
```bash
npm run dev
```

---

## 🔑 API Requirements

To fully experience AI Video Composer, you will need access to the following APIs:

- **[Ollama](https://ollama.com/)**: Used for the core orchestration logic. Ensure you have your API key/endpoint configured.
- **[ElevenLabs](https://elevenlabs.io/)**: High-quality AI voice synthesis for narrations.
- **[Pexels](https://www.pexels.com/api/)**: Sources cinematic stock footage and high-resolution images.
- **[Openverse](https://openverse.org/)**: Open-source audio and music library (No API key required for basic search).

---

## 📂 Project Structure

- `/api`: Vercel Serverless Functions (AI orchestration & TTS)
- `/src/components`: UI modules (Timeline, Canvas, Editor)
- `/src/services`: Core logic (Composition Engine, Media Sourcing)
- `/src/types`: TypeScript definitions for the video data model
- `/public`: Static assets and workers

---

## 🌐 Deployment
The project is optimized for deployment on **Vercel**. Simply connect your repository and add the environment variables in the Vercel dashboard.

---

Made with ❤️ for the AI Video Revolution.
