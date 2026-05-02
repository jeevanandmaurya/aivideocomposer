import { saveAsset } from '../utils/db';
import { extractPeaks } from '../utils/audio';
import type { Asset } from '../types/video';

// Load API keys from environment variables
const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY || '';

export interface SearchResult {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  previewUrl: string;
  name: string;
}

export async function searchMedia(query: string, type: 'image' | 'video' | 'audio'): Promise<SearchResult[]> {
  try {
    if (type === 'audio') {
      // Use Openverse API directly (confirmed to support CORS at the new api.openverse.org endpoint)
      const url = `https://api.openverse.org/v1/audio/?q=${encodeURIComponent(query)}&page_size=10&format=json`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Audio search error: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.results || []).map((hit: any) => ({
        id: `openverse_audio_${hit.id}`,
        type: 'audio',
        url: hit.url,
        previewUrl: hit.thumbnail || 'https://cdn.pixabay.com/audio/static/images/waveform.png',
        name: hit.title || 'Music Track'
      }));
    }

    // Pexels for Image/Video
    const endpoint = type === 'video' ? 'videos/search' : 'search';
    const response = await fetch(`https://api.pexels.com/v1/${endpoint}?query=${encodeURIComponent(query)}&per_page=10`, {
      headers: { Authorization: PEXELS_API_KEY }
    });

    if (response.status === 429) {
      throw new Error('Pexels rate limit exceeded. Please try again later.');
    }

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (type === 'video') {
      return (data.videos || []).map((v: any) => ({
        id: `pexels_${v.id}`,
        type: 'video',
        url: v.video_files[0].link,
        previewUrl: v.image,
        name: `${query} video`
      }));
    } else {
      return (data.photos || []).map((p: any) => ({
        id: `pexels_${p.id}`,
        type: 'image',
        url: p.src.large,
        previewUrl: p.src.medium,
        name: p.alt || `${query} image`
      }));
    }
  } catch (err: any) {
    console.error('Media search failed:', err);
    throw err;
  }
}

export async function downloadMedia(
  result: SearchResult, 
  onProgress?: (progress: number) => void
): Promise<Asset | null> {
  try {
    const response = await fetch(result.url);
    if (!response.body) throw new Error('No response body');

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      if (total && onProgress) {
        onProgress(Math.round((loaded / total) * 100));
      }
    }

    const blob = new Blob(chunks as any);
    const assetId = `asset_${Date.now()}`;
    const newAsset: Asset = {
      id: assetId,
      name: result.name,
      type: result.type,
      url: '', 
      createdAt: Date.now()
    };

    if (result.type === 'audio') {
      newAsset.peaks = await extractPeaks(blob, 40);
    }

    await saveAsset(newAsset, blob);
    return newAsset;
  } catch (err) {
    console.error('Download failed:', err);
    return null;
  }
}
