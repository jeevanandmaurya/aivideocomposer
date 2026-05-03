import { useState, useEffect, useRef, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minimize2, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { getAssets } from '../../utils/db';
import type { Scene, Asset } from '../../types/video';

interface CanvasProps {
  scenes: Scene[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  aspectRatio?: '16:9' | '9:16';
  masterVolume?: number;
  isMuted?: boolean;
  onVolumeChange?: (v: number) => void;
}

const AudioLayer = ({ src, startTime, currentTime, isPlaying, volume = 1 }: { src: string, startTime: number, currentTime: number, isPlaying: boolean, volume?: number }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const isInitialPlay = useRef(true);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Sync only on seek or significant drift (> 0.5s)
  useEffect(() => {
    if (audioRef.current) {
      const offset = currentTime - startTime;
      const drift = Math.abs(audioRef.current.currentTime - offset);
      
      // If we just started or there is a major drift (user seeked), force sync
      if (isInitialPlay.current || drift > 0.5) {
        audioRef.current.currentTime = offset;
        isInitialPlay.current = false;
      }
    }
  }, [startTime, currentTime]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  return <audio ref={audioRef} src={src} preload="auto" style={{ display: 'none' }} />;
};

const VideoLayer = ({ src, startTime, currentTime, isPlaying, volume = 1 }: { src: string, startTime: number, currentTime: number, isPlaying: boolean, volume?: number }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  // Sync only on seek or significant drift (> 0.5s)
  useEffect(() => {
    if (videoRef.current && !videoRef.current.seeking) {
      const offset = currentTime - startTime;
      if (Math.abs(videoRef.current.currentTime - offset) > 0.5) {
        videoRef.current.currentTime = offset;
      }
    }
  }, [startTime, currentTime, src]);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, src]);

  const handleVideoError = (e: any) => {
    console.warn("Video playback error for", src, e);
    // Removed aggressive global refresh to prevent infinite re-render loops
  };

  return (
    <video 
      ref={videoRef} 
      src={src} 
      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
      playsInline 
      loop
      preload="auto"
      onError={handleVideoError}
    />
  );
};

const Canvas = forwardRef<HTMLDivElement, CanvasProps>(({ 
  scenes, 
  currentTime, 
  duration,
  isPlaying,
  onTogglePlay,
  onSeek,
  isFullScreen, 
  onToggleFullScreen,
  aspectRatio = '16:9',
  masterVolume = 1,
  isMuted = false,
  onVolumeChange
}, ref) => {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [globalAssets, setGlobalAssets] = useState<Asset[]>([]);
  const isVertical = aspectRatio === '9:16';

  useEffect(() => {
    const loadAssets = async () => {
      try {
        const assets = await getAssets();
        setGlobalAssets(assets);
      } catch (err) {
        console.error(err);
      }
    };
    loadAssets();
    window.addEventListener('assets_updated', loadAssets);
    return () => {
      window.removeEventListener('assets_updated', loadAssets);
    };
  }, []);

  // Find all active audio scenes
  const audioScenes = scenes.filter(s => s.type === 'audio' && currentTime >= s.startTime && currentTime < s.startTime + s.duration);

  // Find visual scenes
  const visualScenes = scenes
    .filter(s => s.type !== 'audio' && currentTime >= s.startTime && currentTime < s.startTime + s.duration)
    .sort((a,b) => (a.zIndex || 0) - (b.zIndex || 0));

  const baseBackground = visualScenes[0]?.background || '#000000';

  // Auto-hide controls
  useEffect(() => {
    if (!isFullScreen) {
      setShowControls(false);
      return;
    }

    let timeout: number;
    
    // Only auto-hide if playing
    if (isPlaying && showControls) {
      timeout = window.setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => clearTimeout(timeout);
  }, [isFullScreen, isPlaying, lastActivity, showControls]);

  const handleToggleControls = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFullScreen) {
      setShowControls(prev => !prev);
      setLastActivity(Date.now());
    }
  };

  const handleActivity = () => {
    if (isFullScreen && !showControls) {
      setShowControls(true);
      setLastActivity(Date.now());
    } else if (isFullScreen) {
      setLastActivity(Date.now());
    }
  };

  return (
    <div 
      onMouseMove={handleActivity}
      onClick={handleToggleControls}
      style={{ 
        flex: 1, 
        width: '100%',
        height: '100%',
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        position: 'relative',
        overflow: 'hidden',
        padding: isFullScreen ? '0' : '24px',
        cursor: isFullScreen && !showControls ? 'none' : 'default',
        ...(isFullScreen ? {
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          padding: 0,
          background: 'black'
        } : {})
      }}
    >
        <div 
        ref={ref}
        id="preview-container"
        style={{ 
          width: isVertical ? 'auto' : (isFullScreen ? 'min(100vw, calc(100vh * 16 / 9))' : '100%'),
          height: isVertical ? (isFullScreen ? 'min(100vh, calc(100vw * 16 / 9))' : '100%') : (isFullScreen ? 'min(100vh, calc(100vw * 9 / 16))' : 'auto'),
          maxWidth: '100%',
          maxHeight: '100%',
          aspectRatio: isVertical ? '9 / 16' : '16 / 9',
          background: baseBackground,
          transition: 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
          border: isFullScreen ? 'none' : '1px solid var(--border-strong)',
          boxShadow: isFullScreen ? 'none' : '0 10px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          containerType: 'inline-size',
          margin: 'auto'
        }}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
        onClick={onTogglePlay}
      >
        {/* Background Audio Layers */}
        {audioScenes.map(scene => {
          const asset = globalAssets.find(a => a.id === scene.assetId);
          if (!asset) return null;
          return (
            <AudioLayer 
              key={scene.id}
              src={asset.url}
              startTime={scene.startTime}
              currentTime={currentTime}
              isPlaying={isPlaying}
              volume={(scene.volume ?? 1) * (isMuted ? 0 : masterVolume)}
            />
          );
        })}

        <AnimatePresence mode="popLayout">
          {visualScenes.length > 0 ? (
            visualScenes.map((scene) => {
              const asset = globalAssets.find(a => a.id === scene.assetId);
              return (
                <motion.div
                  key={scene.id}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    background: scene.background || 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: scene.zIndex || 0
                  }}
                >
                  {scene.type === 'image' && asset && (
                    <img 
                      src={asset.url} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      alt={scene.text} 
                      onError={() => (window as any).refreshAppAssets?.()}
                    />
                  )}
                  {scene.type === 'video' && asset && (
                    <VideoLayer 
                      src={asset.url} 
                      startTime={scene.startTime} 
                      currentTime={currentTime} 
                      isPlaying={isPlaying} 
                      volume={(scene.volume ?? 1) * (isMuted ? 0 : masterVolume)}
                    />
                  )}
                  {(!scene.type || scene.type === 'text' || scene.type === 'html') && (
                    <div style={{ padding: '8cqw', width: '100%', height: '100%', boxSizing: 'border-box' }}>
                      {scene.html ? (
                        <>
                          <style>
                            {`
                              #preview-html-content-${scene.id} * {
                                animation-play-state: ${isPlaying ? 'running' : 'paused'} !important;
                                animation-delay: -${currentTime - scene.startTime}s !important;
                              }
                            `}
                          </style>
                          <div id={`preview-html-content-${scene.id}`} dangerouslySetInnerHTML={{ __html: scene.html }} />
                        </>
                      ) : (
                        <h2 style={{ 
                          fontSize: `${Math.max(3, Math.min(8.5, 350 / (scene.text.length || 1)))}cqw`,
                          fontWeight: 700, 
                          color: 'white',
                          lineHeight: 1.1,
                          fontFamily: 'Poppins, sans-serif',
                          textShadow: '0 0.5cqw 2cqw rgba(0,0,0,0.6)',
                          wordWrap: 'break-word',
                          overflowWrap: 'anywhere',
                          margin: 0,
                          padding: 0,
                          width: '100%',
                          ...scene.style
                        }}>
                          {scene.text}
                        </h2>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })
          ) : (
            <div style={{ color: 'var(--text-tertiary)', fontSize: '14px', fontFamily: 'Lora, serif', fontStyle: 'italic', position: 'absolute', zIndex: 10 }}>
              {scenes.length > 0 ? `No scene active at ${currentTime.toFixed(1)}s` : 'Add scenes to start preview'}
            </div>
          )}
        </AnimatePresence>

        {/* Full Screen Overlay Controls - Brutalist */}
        <AnimatePresence>
          {isFullScreen && showControls && (
            <motion.div
              initial={{ opacity: 0, y: 20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 20, x: '-50%' }}
              style={{
                position: 'absolute',
                bottom: '32px',
                left: '50%',
                x: '-50%',
                width: 'min(90%, 800px)',
                background: 'var(--bg-secondary)',
                borderRadius: '0',
                border: '2px solid var(--border-strong)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                zIndex: 1100,
                boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Progress Bar */}
              <div 
                style={{ 
                  height: '4px', 
                  background: 'var(--border-strong)', 
                  borderRadius: '0', 
                  position: 'relative',
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  onSeek((x / rect.width) * duration);
                }}
              >
                <div 
                  style={{ 
                    height: '100%', 
                    background: 'var(--brand-accent)', 
                    borderRadius: '0',
                    width: `${(currentTime / duration) * 100}%`
                  }} 
                />
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <button onClick={() => onSeek(Math.max(0, currentTime - 5))} style={{ color: 'var(--text-primary)' }}><SkipBack size={24} strokeWidth={3} /></button>
                    <button 
                      onClick={onTogglePlay}
                      style={{ 
                        background: 'var(--text-primary)', 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '0', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'var(--bg-primary)'
                      }}
                    >
                      {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: '4px' }} />}
                    </button>
                    <button onClick={() => onSeek(Math.min(duration, currentTime + 5))} style={{ color: 'var(--text-primary)' }}><SkipForward size={24} strokeWidth={3} /></button>
                  </div>
                  
                  <div 
                    style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                    onMouseEnter={() => setShowVolumeSlider(true)}
                    onMouseLeave={() => setShowVolumeSlider(false)}
                  >
                    <button 
                      onClick={() => onVolumeChange?.(isMuted ? (masterVolume || 1) : 0)} 
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {isMuted || masterVolume === 0 ? <VolumeX size={24} strokeWidth={3} /> : <Volume2 size={24} strokeWidth={3} />}
                    </button>
                    
                    {showVolumeSlider && (
                      <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '16px 8px',
                        background: 'var(--bg-secondary)',
                        border: '2px solid var(--border-strong)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                        zIndex: 1200,
                        width: '40px',
                        marginBottom: '10px'
                      }}>
                        <div style={{ height: '100px', width: '4px', background: 'var(--bg-accent)', position: 'relative' }}>
                          <input 
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={masterVolume}
                            onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%) rotate(-90deg)',
                              width: '100px',
                              height: '24px',
                              background: 'transparent',
                              appearance: 'none',
                              cursor: 'pointer',
                              accentColor: 'var(--brand-accent)'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <span style={{ color: 'var(--brand-accent)', fontSize: '16px', fontWeight: 800, fontFamily: 'monospace' }}>
                    {isNaN(currentTime) ? '00:00' : new Date(currentTime * 1000).toISOString().substr(14, 5)} 
                    <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>/ {isNaN(duration) || duration === 0 ? '00:00' : new Date(duration * 1000).toISOString().substr(14, 5)}</span>
                  </span>
                </div>

                <button 
                  onClick={onToggleFullScreen}
                  style={{ color: 'var(--text-primary)', border: '2px solid var(--border-strong)', padding: '12px' }}
                >
                  <Minimize2 size={24} strokeWidth={3} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default Canvas;

