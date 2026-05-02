# AI Video Composer: Detailed Architecture

## 1. Project Overview
AI Video Composer is a sophisticated, AI-driven web application for creating cinematic videos through natural language prompts. It combines LLM-based script generation with a dynamic composition engine that orchestrates stock media, AI voiceovers, and high-fidelity HTML/CSS templates.

## 2. Technology Stack
- **Frontend**: 
  - **Framework**: React 18 with Vite.
  - **Language**: TypeScript.
  - **Styling**: Vanilla CSS (Global Design System) + Inline Styles for dynamic AI layouts.
  - **Icons**: Lucide React.
  - **State Management**: React Context API (`ProjectContext`, `ThemeContext`).
  - **Storage**: IndexedDB (via `idb`) for persistent asset and project management.
- **Backend**:
  - **Platform**: Vercel Serverless Functions.
  - **Runtime**: Edge Runtime (for performance).
  - **AI Integration**: AI SDK (Vercel), OpenAI-compatible providers (Ollama Cloud).
- **External Services**:
  - **Stock Media**: Pexels (likely, via `mediaService`).
  - **TTS**: OpenAI / ElevenLabs compatible (via `ttsService`).

---

## 3. Core Architecture

### A. Frontend Organization (`/src`)
The frontend is organized into functional modules:
- **`components/`**: Atomic and complex UI elements.
  - `editor/`: The core workspace.
    - **`Canvas.tsx`**: The main viewport rendering the current frame. Handles multi-layered rendering (Video, HTML, Image, Overlays).
    - **`Timeline.tsx`**: Visual representation of scenes across time. Handles seeking, playback synchronization, and layer management.
    - **`AIChat.tsx`**: The primary interface for project generation and modification. Communicates with the backend and drives the composition engine.
    - **`Sidebar.tsx`**: Asset library, project settings, and manual scene editing.
- **`services/`**: Infrastructure logic.
  - **`ai.ts`**: Proxies requests to the AI generation API.
  - **`compositionEngine.ts`**: The "brain" that translates AI plans into functional video projects.
  - **`mediaService.ts`**: Handles searching and downloading stock assets.
  - **`ttsService.ts`**: Interfaces with text-to-speech APIs.
- **`store/` / `contexts/`**: Global state containers.
  - **`ProjectContext.tsx`**: Manages the current `VideoProject` state, including scenes, loading states, and playback indices.
  - **`ThemeContext.tsx`**: Manages the application's aesthetic (Dark/Light mode).
- **`workers/`**: Potential background processes for export or heavy processing.

### B. Backend Organization (`/api`)
Serverless functions handling sensitive API interactions:
- **`generate.ts`**: The AI "Director". It uses a massive, multi-modal prompt to turn user requests into a `CompositionPlan` (JSON). It uses streaming to provide real-time "thinking" feedback.
- **`tts.ts`**: Generates audio assets from text scripts.
- **`voices.ts`**: Lists available AI voices.

---

## 4. Data Models (`/src/types/video.ts`)

### `VideoProject`
The root container for a project.
```typescript
interface VideoProject {
  id: string;
  name: string;
  scenes: Scene[];
  aspectRatio: '16:9' | '9:16';
}
```

### `Scene`
A single segment in the timeline.
```typescript
interface Scene {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'html';
  duration: number; // seconds
  startTime: number;
  zIndex?: number; // Layering: negative for audio, positive for overlays
  assetId?: string; // Reference to a downloaded Asset
  html?: string; // Dynamic HTML template
  background?: string; // Background color or image
}
```

### `Asset`
A piece of media stored in IndexedDB.
```typescript
interface Asset {
  id: string;
  type: 'image' | 'video' | 'audio' | 'script';
  url: string; // Object URL or Base64
  thumbnail?: string;
}
```

---

## 5. Key Workflows

### 🎬 The Generation Pipeline
1.  **Input**: User types "Create a 30s tech noir video about AI."
2.  **AI Request**: `AIChat.tsx` sends the prompt + current project context to `/api/generate`.
3.  **Streaming Plan**: The AI streams a JSON object containing `media_needs` (stock queries, VO scripts) and `scenes` (HTML templates with placeholders).
4.  **Composition Execution**: `compositionEngine.ts` takes the plan:
    -   **Parallel Searching**: Searches Pexels/Stock APIs for images and videos.
    -   **TTS Generation**: Generates voiceover audio for each scene.
    -   **Downloading**: Downloads assets to local blobs and stores them in IndexedDB.
    -   **HTML Injection**: Replaces placeholders like `{{MEDIA_0}}` with local blob URLs.
5.  **State Update**: The `VideoProject` is updated, triggering a re-render of the `Timeline` and `Canvas`.

### 🖼️ Rendering & Preview
-   The **`Canvas`** component monitors the global `currentTime`.
-   It filters `scenes` that are active at the current time.
-   It renders a stack of layers based on `zIndex`:
    -   **Bottom**: Background video/images.
    -   **Middle**: HTML templates (rendered via `dangerouslySetInnerHTML` with scoped CSS).
    -   **Top**: Overlays (Film grain, vignettes).

---

## 6. Design System & Aesthetics
The application follows an **"Elite Cinematic"** design philosophy:
-   **Variables**: Defined in `index.css` (e.g., `--brand-accent: #d97757`).
-   **Components**: Glassmorphism (`GlassCard.tsx`), high-contrast dark mode, and heavy use of typography (Poppins & Lora).
-   **AI Templates**: The AI is instructed to use advanced CSS like `mix-blend-mode`, `backdrop-filter`, and `cqw` (container query width) units for responsiveness.

## 7. Performance & Optimization
-   **IndexedDB**: Avoids re-downloading large media files on refresh.
-   **Blob URLs**: Used for low-latency media playback without server round-trips.
-   **Edge Runtime**: Minimizes latency for AI stream starts.
