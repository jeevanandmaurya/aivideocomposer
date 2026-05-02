
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// Switch to Node.js runtime to support the ElevenLabs SDK
export const config = {
  runtime: 'nodejs',
};

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

const streamToBuffer = async (stream: any) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const VOICE_MAP: Record<string, string> = {
  'george': 'JBFqnCBsd6RMkjVDRZzb',
  'sarah': 'EXAVITQu4vr4xnSDxMaL',
  'river': 'SAz9YHcvj6GT2YYXdXww'
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  let { text, voiceId, voiceName } = req.body;

  // Resolve voiceName to voiceId to prevent hallucination errors
  if (voiceName) {
    const resolvedId = VOICE_MAP[voiceName.toLowerCase()];
    if (resolvedId) {
      voiceId = resolvedId;
    }
  }

  // Final fallback
  if (!voiceId) {
    voiceId = 'JBFqnCBsd6RMkjVDRZzb'; // Default to George
  }

  if (!text) {
    res.status(400).json({ error: 'Text is required' });
    return;
  }

  try {
    const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
      text,
      modelId: 'eleven_v3',
      outputFormat: 'mp3_44100_128',
    });

    const audioBuffer = await streamToBuffer(audioStream);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(audioBuffer);
  } catch (error: any) {
    console.error('ElevenLabs TTS Error:', error);
    res.status(500).json({ error: error.message || 'TTS API error' });
  }
}
