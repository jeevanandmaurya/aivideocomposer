import type { Asset } from '../types/video';

const DB_NAME = 'AIVideoComposerDB';
const STORE_NAME = 'global_assets';
const DB_VERSION = 1;
const urlCache = new Map<string, string>();

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAsset(asset: Asset, blob: Blob): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ ...asset, blob });
    tx.oncomplete = () => {
      window.dispatchEvent(new Event('assets_updated'));
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAssets(): Promise<Asset[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const assets = request.result.map(item => {
        // Reuse existing URL if available to prevent flickering and ERR_FILE_NOT_FOUND
        let url = urlCache.get(item.id);
        if (!url) {
          url = URL.createObjectURL(item.blob);
          urlCache.set(item.id, url);
        }
        return {
          ...item,
          url
        } as Asset;
      });
      resolve(assets.sort((a,b) => b.createdAt - a.createdAt));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteAsset(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => {
      const url = urlCache.get(id);
      if (url) {
        URL.revokeObjectURL(url);
        urlCache.delete(id);
      }
      window.dispatchEvent(new Event('assets_updated'));
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}
