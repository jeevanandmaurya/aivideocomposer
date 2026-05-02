export async function extractPeaks(blob: Blob, samples: number = 100): Promise<number[]> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  const channelData = audioBuffer.getChannelData(0);
  const step = Math.floor(channelData.length / samples);
  const peaks: number[] = [];
  
  for (let i = 0; i < samples; i++) {
    const start = i * step;
    const end = start + step;
    let max = 0;
    for (let j = start; j < end; j++) {
      const v = Math.abs(channelData[j]);
      if (v > max) max = v;
    }
    peaks.push(max);
  }
  
  // Normalize peaks
  const maxPeak = Math.max(...peaks);
  return peaks.map(p => (maxPeak > 0 ? p / maxPeak : 0));
}
