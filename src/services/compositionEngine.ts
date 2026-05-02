import { searchMedia, downloadMedia } from './mediaService';
import type { Asset, Scene, VideoProject } from '../types/video';

export interface MediaNeed {
  type: 'image' | 'video' | 'audio';
  query: string;
  purpose: string;
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
    };

    // If this scene references a downloaded media asset
    if (raw.mediaIndex !== undefined && raw.mediaIndex !== null) {
      const asset = downloadedAssets.get(raw.mediaIndex);
      if (asset) {
        scene.type = asset.type as any;
        scene.assetId = asset.id;
      }
    } else if (raw.html) {
      scene.type = 'html';
      
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
      }
    }

    // Audio layers (zIndex < 0 or type=audio) run in parallel, not sequentially
    if (scene.type === 'audio' || (scene.zIndex !== undefined && scene.zIndex < 0)) {
      scene.startTime = 0; // audio starts at the beginning
      // Duration spans the full video length — we'll fix it after calculating total
    } else {
      scene.startTime = currentStart;
      currentStart += scene.duration;
    }

    finalScenes.push(scene);
  }

  // Fix audio layer duration to span the full visual timeline
  const totalVisualDuration = currentStart;
  for (const scene of finalScenes) {
    if (scene.type === 'audio' || (scene.zIndex !== undefined && scene.zIndex < 0)) {
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
