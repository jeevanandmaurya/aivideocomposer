import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

let muxer: Muxer<ArrayBufferTarget> | null = null;
let videoEncoder: VideoEncoder | null = null;
let fps = 30;

self.onmessage = async (e) => {
  const { type, data } = e.data;

  if (type === 'configure') {
    const { width, height, bitrate, codec } = data;
    fps = data.fps;

    muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: {
        codec: 'avc',
        width,
        height
      },
      firstTimestampBehavior: 'offset',
      fastStart: 'in-memory'
    });

    videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer?.addVideoChunk(chunk, meta),
      error: (err) => (self as any).postMessage({ type: 'error', error: err.message })
    });

    videoEncoder.configure({
      codec,
      width,
      height,
      bitrate,
      framerate: fps
    });

    (self as any).postMessage({ type: 'configured' });
  }

  if (type === 'frame') {
    const { bitmap, frameIndex, keyFrame } = data;

    if (!videoEncoder) return;

    // Backpressure - don't flood the encoder
    while (videoEncoder.encodeQueueSize > 5) {
      await new Promise(r => setTimeout(r, 5));
    }

    // Capture Frame from Bitmap
    const frame = new VideoFrame(bitmap, {
      timestamp: (frameIndex * 1000000) / fps,
      duration: 1000000 / fps
    });

    videoEncoder.encode(frame, { keyFrame });
    frame.close();
    bitmap.close(); // Free memory immediately

    // Ack back to main thread
    (self as any).postMessage({ type: 'frame_done' });
  }

  if (type === 'finalize') {
    if (videoEncoder && videoEncoder.state !== 'closed') {
      await videoEncoder.flush();
      videoEncoder.close();
    }
    
    if (muxer) {
      muxer.finalize();
      const { buffer } = muxer.target;
      (self as any).postMessage({ type: 'complete', buffer }, [buffer]);
    }
    
    muxer = null;
    videoEncoder = null;
  }

  if (type === 'cancel') {
    if (videoEncoder && videoEncoder.state !== 'closed') {
      videoEncoder.close();
    }
    muxer = null;
    videoEncoder = null;
    (self as any).postMessage({ type: 'cancelled' });
  }
};
