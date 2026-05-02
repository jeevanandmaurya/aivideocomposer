/**
 * Extracts a thumbnail from a video file at a specific time (default 1s).
 */
export const captureVideoThumbnail = (file: File, time: number = 1): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      URL.revokeObjectURL(video.src);
      video.remove();
    };

    video.onloadedmetadata = () => {
      // Seek to requested time or half duration
      video.currentTime = Math.min(time, video.duration / 2);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
        cleanup();
        resolve(thumbnail);
      } catch (err) {
        console.error('Thumbnail extraction failed:', err);
        cleanup();
        resolve('');
      }
    };

    video.onerror = () => {
      console.error('Video load failed for thumbnail');
      cleanup();
      resolve('');
    };

    video.src = URL.createObjectURL(file);
  });
};
