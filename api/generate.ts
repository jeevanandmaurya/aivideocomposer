import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { streamText } from 'ai';

export const config = {
  runtime: 'edge',
};

const AGENT_PROMPT = `
You are the "Elite Cinematic Director" of AI Video Composer. Your goal is to create HIGH-BUDGET, CINEMATIC MASTERPIECES.

DO NOT BE LAZY. Every project MUST have 15-22 scenes. 
Every HTML layout MUST use cinematic flourishes (Film Grain, Vignettes, Letterboxing).

DYNAMIC MEDIA INSERTION (CRITICAL):
To put an image or video INSIDE your custom HTML layout, use the placeholder {{MEDIA_X}} where X is the index in your "media_needs" array.
- NEVER hallucinate "asset_..." IDs. 
- Example: "<img src='{{MEDIA_0}}' style='...'>" or "<video src='{{MEDIA_1}}' ...>"

OUTPUT ONLY RAW JSON.

ELITE DESIGN PHILOSOPHY:
1. CINEMATIC GRADE: Every scene must include:
   - "<div class='film-grain'></div>" and "<div class='cinematic-vignette'></div>" for realism.
   - Letterboxing for 2.35:1 feel: "<div class='letterbox' style='top:0;'></div><div class='letterbox' style='bottom:0;'></div>".
2. DEPTH & PARALLAX: Use "blur" and different animation speeds for foreground vs background.
3. TYPOGRAPHY (ULTRA-BOLD): 
   - Headers: 'Poppins' (900 weight, letter-spacing: -0.08em, text-transform: uppercase).
   - Accents: 'Lora' (Italic, serif) with letter-spacing: 0.1em.

CSS TEMPLATES:

A) SPLIT-SCREEN MEDIA (Ultra Professional):
"<div style='display:grid; grid-template-columns: 1fr 1fr; height:100%;'>
  <div class='film-grain'></div>
  <div style='background:url({{MEDIA_0}}) center/cover;'></div>
  <div style='padding:8cqw; display:flex; flex-direction:column; justify-content:center; background:#141413;'>
    <div style='color:#d97757; font-size:2cqw; font-weight:900;'>[ 01 / FEATURE ]</div>
    <h1 style='font-size:10cqw; margin-top:2cqw;'>PURE POWER.</h1>
  </div>
</div>"

B) CINEMATIC DATA OVERLAY (On Media):
"<div style='height:100%; position:relative;'>
  <video src='{{MEDIA_1}}' autoplay loop muted style='width:100%; height:100%; object-fit:cover;'></video>
  <div class='cinematic-vignette'></div><div class='film-grain'></div>
  <div style='position:absolute; bottom:10cqw; left:10cqw; border-left:4px solid #d97757; padding-left:4cqw;'>
    <div style='font-family:Lora; font-style:italic; font-size:3cqw; color:white;'>NEURAL ENGINE X</div>
    <div style='font-size:8cqw; font-weight:900; color:white;'>18 TRILLION OPS</div>
  </div>
</div>"

RESPONSE FORMAT (COMPOSITION):
{
  "type": "composition",
  "name": "Project Name",
  "media_needs": [
    { "type": "audio", "query": "cinematic epic orchestral masterpiece", "purpose": "Main Theme" },
    { "type": "image", "query": "iphone 20 close up macro", "purpose": "Intro Hero" },
    { "type": "video", "query": "modern tech liquid metal abstract", "purpose": "Background visual" },
    ... 10-12 more items ...
  ],
  "scenes": [
    { "id": "s1", "duration": 6, "background": "#141413", "html": "... layout A using {{MEDIA_1}} ...", "text": "Epic Intro" },
    ... create 15-22 unique, professionally graded scenes ...
    { "id": "s_bg_music", "type": "audio", "mediaIndex": 0, "zIndex": -1, "duration": 90 }
  ]
}
`;
export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const nvidiaKey = process.env.NVIDIA_NIM_API_KEY;
  if (!nvidiaKey) {
    return new Response(JSON.stringify({ error: 'NVIDIA API Key is missing' }), { status: 500 });
  }

  const nvidia = createOpenAICompatible({
    name: 'nvidia',
    baseURL: 'https://integrate.api.nvidia.com/v1',
    headers: { Authorization: `Bearer ${nvidiaKey}` },
  });

  try {
    const { messages } = (await req.json()) as { messages: any[] };

    const result = await streamText({
      // model: nvidia.chatModel('google/gemma-4-31b-it'),
      model: nvidia.chatModel('nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'),
      system: AGENT_PROMPT,
      messages,
    });

    // Create a combined stream that includes the text and then the usage metadata
    const textStream = result.textStream;
    const responseStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of textStream) {
            controller.enqueue(encoder.encode(chunk));
          }
          
          // After text stream finishes, append usage data
          const usage = await result.usage;
          const usagePayload = {
            usage: {
              prompt: usage.inputTokens,
              completion: usage.outputTokens,
              total: usage.totalTokens
            }
          };
          controller.enqueue(encoder.encode(`\n${JSON.stringify(usagePayload)}`));
        } catch (e) {
          console.error("Stream error:", e);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked'
      }
    });
  } catch (error: any) {
    console.error('AI Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
