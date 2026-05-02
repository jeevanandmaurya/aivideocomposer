import { searchMedia, downloadMedia } from './mediaService';
import { generateTTS } from './ttsService';
import type { Asset, Scene, VideoProject } from '../types/video';

export interface MediaNeed {
  type: 'image' | 'video' | 'audio' | 'voiceover';
  query: string; // for voiceover, this is the text to speak
  purpose: string;
  voiceId?: string;
  voiceName?: string;
}

export interface CompositionScene {
  id: string;
  text: string;
  duration: number;
  startTime?: number;
  zIndex?: number;
  type?: 'text' | 'image' | 'video' | 'audio' | 'html';
  html?: string;
  background?: string;
  mediaIndex?: number; // index into media_needs array
  volume?: number;
}

export interface CompositionPlan {
  type: 'composition';
  name: string;
  description: string;
  media_needs: MediaNeed[];
  scenes: CompositionScene[];
}

export type CompositionStep =
  | { phase: 'searching'; mediaIndex: number; query: string; mediaType: string }
  | { phase: 'downloading'; mediaIndex: number; query: string; mediaType: string; progress: number }
  | { phase: 'downloaded'; mediaIndex: number; query: string; mediaType: string; assetId: string }
  | { phase: 'search_failed'; mediaIndex: number; query: string; mediaType: string; error: string }
  | { phase: 'generating_tts'; mediaIndex: number; text: string }
  | { phase: 'building'; message: string }
  | { phase: 'complete'; project: Partial<VideoProject> };

/**
 * Executes a full composition plan:
 *  1. For each media_need, search → pick best → download
 *  2. Build the final scenes array with real assetIds
 *  3. Return the project update
 */
export async function executeComposition(
  plan: CompositionPlan,
  onStep: (step: CompositionStep) => void
): Promise<Partial<VideoProject>> {
  // Map from mediaIndex → downloaded Asset
  const downloadedAssets: Map<number, Asset> = new Map();

  // --- Phase 1: Search and download all media ---
  for (let i = 0; i < plan.media_needs.length; i++) {
    const need = plan.media_needs[i];

    if (need.type === 'voiceover') {
      onStep({
        phase: 'generating_tts',
        mediaIndex: i,
        text: need.query,
      });

      try {
        const asset = await generateTTS(need.query, need.voiceId, (need as any).voiceName);
        if (asset) {
          downloadedAssets.set(i, asset);
          onStep({
            phase: 'downloaded',
            mediaIndex: i,
            query: need.query,
            mediaType: 'voiceover',
            assetId: asset.id,
          });
        }
      } catch (err: any) {
        onStep({
          phase: 'search_failed',
          mediaIndex: i,
          query: need.query,
          mediaType: 'voiceover',
          error: err.message || 'TTS Generation failed',
        });
      }
      continue;
    }

    // Report: searching
    onStep({
      phase: 'searching',
      mediaIndex: i,
      query: need.query,
      mediaType: need.type,
    });

    try {
      const results = await searchMedia(need.query, need.type);

      if (results.length === 0) {
        onStep({
          phase: 'search_failed',
          mediaIndex: i,
          query: need.query,
          mediaType: need.type,
          error: `No results found for "${need.query}"`,
        });
        continue;
      }

      // Pick the first result (best match)
      const pick = results[0];

      // Report: downloading
      onStep({
        phase: 'downloading',
        mediaIndex: i,
        query: need.query,
        mediaType: need.type,
        progress: 0,
      });

      const asset = await downloadMedia(pick, (progress) => {
        onStep({
          phase: 'downloading',
          mediaIndex: i,
          query: need.query,
          mediaType: need.type,
          progress,
        });
      });

      if (asset) {
        downloadedAssets.set(i, asset);
        onStep({
          phase: 'downloaded',
          mediaIndex: i,
          query: need.query,
          mediaType: need.type,
          assetId: asset.id,
        });
      } else {
        onStep({
          phase: 'search_failed',
          mediaIndex: i,
          query: need.query,
          mediaType: need.type,
          error: 'Download failed',
        });
      }
    } catch (err: any) {
      onStep({
        phase: 'search_failed',
        mediaIndex: i,
        query: need.query,
        mediaType: need.type,
        error: err.message || 'Unknown error',
      });
    }
  }

  // --- Phase 2: Build final scenes ---
  onStep({ phase: 'building', message: 'Assembling timeline...' });

  let currentStart = 0;
  const finalScenes: Scene[] = [];

  for (const raw of plan.scenes) {
    const scene: Scene = {
      id: raw.id || `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: raw.text || '',
      duration: typeof raw.duration === 'string' ? parseInt(raw.duration as any) : (raw.duration || 5),
      startTime: 0,
      zIndex: raw.zIndex,
      html: raw.html,
      background: raw.background,
      volume: raw.volume,
    };

    // If this scene references a downloaded media asset directly
    if (raw.mediaIndex !== undefined && raw.mediaIndex !== null) {
      const asset = downloadedAssets.get(raw.mediaIndex);
      if (asset) {
        scene.type = (raw.html ? 'html' : asset.type) as any;
        scene.assetId = asset.id;
      }
    } else if (raw.html) {
      scene.type = 'html';
    }

    // Dynamic Media Insertion: Replace {{MEDIA_0}}, {{MEDIA_1}}... with real URLs
    if (scene.html && scene.html.includes('{{MEDIA_')) {
      let processedHtml: string | undefined = scene.html;
      downloadedAssets.forEach((asset, index) => {
        if (processedHtml) {
          const placeholder = new RegExp(`{{MEDIA_${index}}}`, 'g');
          processedHtml = processedHtml.replace(placeholder, asset.url);
        }
      });
      scene.html = processedHtml;
      if (!scene.type) scene.type = 'html';
    }

    // Audio layers: Background music (zIndex -1) usually starts at 0. 
    // Voiceovers (zIndex -2) or specific audio cues should follow the visual timeline or use an explicit startTime.
    if (scene.type === 'audio' || (scene.zIndex !== undefined && scene.zIndex < 0)) {
      scene.startTime = raw.startTime !== undefined ? raw.startTime : 0;
    } else {
      scene.startTime = currentStart;
      currentStart += scene.duration;
    }

    finalScenes.push(scene);
  }

  // Fix background music duration to span the full visual timeline
  // We only do this for the "master" audio track (usually zIndex -1)
  const totalVisualDuration = currentStart;
  for (const scene of finalScenes) {
    if (scene.zIndex === -1) {
      scene.duration = totalVisualDuration;
    }
  }

  const projectUpdate: Partial<VideoProject> = {
    name: plan.name,
    description: plan.description,
    scenes: finalScenes,
  };

  onStep({ phase: 'complete', project: projectUpdate });

  return projectUpdate;
}
