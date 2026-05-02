import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

let muxer: Muxer<ArrayBufferTarget> | null = null;
let videoEncoder: VideoEncoder | null = null;
let audioEncoder: AudioEncoder | null = null;
let fps = 30;
let audioSampleRate = 44100;

self.onmessage = async (e) => {
  const { type, data } = e.data;

  if (type === 'configure') {
    const { width, height, bitrate, codec, audioBitrate = 128000 } = data;
    fps = data.fps;
    audioSampleRate = data.sampleRate || 44100;

    muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: {
        codec: 'avc',
        width,
        height
      },
      audio: {
        codec: 'aac',
        numberOfChannels: 2,
        sampleRate: audioSampleRate
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

    audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer?.addAudioChunk(chunk, meta),
      error: (err) => (self as any).postMessage({ type: 'error', error: err.message })
    });

    audioEncoder.configure({
      codec: 'mp4a.40.2',
      numberOfChannels: 2,
      sampleRate: audioSampleRate,
      bitrate: audioBitrate
    });

    (self as any).postMessage({ type: 'configured' });
  }

  if (type === 'frame') {
    const { bitmap, frameIndex, keyFrame } = data;
    if (!videoEncoder) return;

    while (videoEncoder.encodeQueueSize > 10) {
      await new Promise(r => setTimeout(r, 5));
    }

    const frame = new VideoFrame(bitmap, {
      timestamp: (frameIndex * 1000000) / fps,
      duration: 1000000 / fps
    });

    videoEncoder.encode(frame, { keyFrame });
    frame.close();
    bitmap.close();
    (self as any).postMessage({ type: 'frame_done' });
  }

  if (type === 'audio_chunk') {
    const { chan0, chan1, timestamp } = data;
    if (!audioEncoder) return;

    // Correctly handle planar audio for AudioData constructor
    // For f32-planar, data must be a single buffer where channels are concatenated
    const numberOfFrames = chan0.length;
    const combinedData = new Float32Array(numberOfFrames * 2);
    combinedData.set(chan0, 0);
    combinedData.set(chan1, numberOfFrames);

    const audioFrame = new AudioData({
      format: 'f32-planar',
      sampleRate: audioSampleRate,
      numberOfFrames,
      numberOfChannels: 2,
      timestamp,
      data: combinedData
    });

    audioEncoder.encode(audioFrame);
    audioFrame.close();
    (self as any).postMessage({ type: 'audio_done' });
  }

  if (type === 'finalize') {
    if (videoEncoder && videoEncoder.state !== 'closed') {
      await videoEncoder.flush();
      videoEncoder.close();
    }
    
    if (audioEncoder && audioEncoder.state !== 'closed') {
      await audioEncoder.flush();
      audioEncoder.close();
    }
    
    if (muxer) {
      muxer.finalize();
      const { buffer } = muxer.target;
      (self as any).postMessage({ type: 'complete', buffer }, [buffer]);
    }
    
    muxer = null;
    videoEncoder = null;
    audioEncoder = null;
  }
};
