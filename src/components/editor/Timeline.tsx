import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, ZoomIn, ZoomOut, Volume2, Maximize, Scissors, Trash2, GripVertical } from 'lucide-react';
import type { Scene, Asset } from '../../types/video';
import { saveAsset, getAssets } from '../../utils/db';
import { extractPeaks } from '../../utils/audio';
import { captureVideoThumbnail } from '../../utils/video';

interface TimelineProps {
  scenes: Scene[];
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onUpdateScenes: (newScenes: Scene[]) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onToggleFullScreen: () => void;
  isMobile?: boolean;
  assets?: Asset[];
}

const TimelineScene = ({ 
  scene, 
  assets, 
  zoom, 
  resizingSceneId, 
  onResizeStart,
  onUpdateVolume,
  isSelected,
  onSelect,
  onDragStart
}: { 
  scene: Scene, 
  assets: Asset[], 
  zoom: number, 
  resizingSceneId: string | null,
  onResizeStart: (e: React.MouseEvent, id: string) => void,
  onUpdateVolume: (id: string, volume: number) => void,
  isSelected: boolean,
  onSelect: (id: string) => void,
  onDragStart: (e: React.MouseEvent, id: string) => void
}) => {
  const isAudio = scene.type === 'audio' || (scene.zIndex !== undefined && scene.zIndex < 0);

  return (
    <div 
      onClick={(e) => { e.stopPropagation(); onSelect(scene.id); }}
      onMouseDown={(e) => { 
        if ((e.target as HTMLElement).closest('.resize-handle')) return;
        onDragStart(e, scene.id);
      }}
      style={{
        position: 'absolute',
        left: `${(scene.startTime * zoom) + 24}px`,
        width: `${scene.duration * zoom}px`,
        height: '100%',
        background: isSelected ? 'var(--bg-accent)' : 'var(--bg-primary)',
        border: isSelected ? `2px solid var(--brand-accent)` : '1px solid var(--border-strong)',
        borderTop: `3px solid ${isAudio ? '#10b981' : 'var(--brand-accent)'}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: '8px 12px',
        fontSize: '10px',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--text-primary)',
        boxSizing: 'border-box',
        overflow: 'hidden',
        zIndex: isSelected || resizingSceneId === scene.id ? 20 : 1,
        cursor: 'grab',
        transition: 'border 0.2s, background 0.2s'
      }}
    >
      {/* Drag Handle */}
      <div style={{ position: 'absolute', left: 2, top: '50%', transform: 'translateY(-50%)', opacity: 0.3, pointerEvents: 'none' }}>
        <GripVertical size={12} />
      </div>

      {/* Media Preview (Image/Video Thumbnails) */}
      {(scene.type === 'image' || scene.type === 'video') && (
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          opacity: 0.3, 
          zIndex: 0,
          pointerEvents: 'none'
        }}>
          {(() => {
            const asset = assets.find(a => a.id === scene.assetId);
            const previewUrl = scene.type === 'video' ? asset?.thumbnail : asset?.url;
            if (previewUrl) {
              return <img src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />;
            }
            return null;
          })()}
        </div>
      )}

      {/* Script/Text Preview */}
      {(!scene.type || scene.type === 'text' || scene.type === 'html') && (
        <div style={{ 
          fontSize: '8px', 
          color: 'var(--text-tertiary)', 
          marginTop: '4px',
          fontStyle: 'italic',
          lineHeight: 1.2,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          zIndex: 2
        }}>
          {scene.html?.replace(/<[^>]*>?/gm, '') || scene.text}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', zIndex: 2, gap: '8px' }}>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {scene.text || (isAudio ? 'Audio Clip' : 'Scene')}
        </span>
        {isAudio && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: '2px' }}>
            <Volume2 size={10} color="#10b981" />
            <span style={{ fontSize: '8px', color: '#10b981', minWidth: '20px' }}>{Math.round((scene.volume ?? 1) * 100)}%</span>
          </div>
        )}
      </div>

      {isAudio && (() => {
        const asset = assets.find(a => a.id === scene.assetId);
        const peaks = asset?.peaks || Array.from({ length: 40 }).map((_, i) => {
          const seed = (scene.id.charCodeAt(i % scene.id.length) || 0) + i;
          return 0.2 + (Math.abs(Math.sin(seed)) * 0.6);
        });
        
        return (
          <>
            <div style={{ 
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              right: 0, 
              height: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1px', 
              padding: '0 4px',
              opacity: 0.4,
              pointerEvents: 'none'
            }}>
              {peaks.map((peak, i) => (
                <div 
                  key={i} 
                  style={{ 
                    flex: 1, 
                    background: '#10b981', 
                    height: `${Math.max(10, peak * 100)}%`,
                    borderRadius: '1px'
                  }} 
                />
              ))}
            </div>
            
            {/* Volume Control Overlay */}
            <div style={{ 
              position: 'absolute', 
              bottom: '4px', 
              left: '12px', 
              right: '12px', 
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              height: '12px'
            }}>
              <input 
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={scene.volume ?? 1}
                onChange={(e) => onUpdateVolume(scene.id, parseFloat(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  height: '2px',
                  appearance: 'none',
                  background: 'rgba(255,255,255,0.1)',
                  outline: 'none',
                  cursor: 'pointer',
                  accentColor: '#10b981'
                }}
              />
            </div>
          </>
        );
      })()}
    
      {/* Resize Handle */}
      <div 
        className="resize-handle"
        onMouseDown={(e) => onResizeStart(e, scene.id)}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: '10px',
          height: '100%',
          cursor: 'col-resize',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: '2px', height: '12px', background: 'var(--text-tertiary)', opacity: 0.3 }} />
      </div>
    </div>
  );
};

export default function Timeline({ 
  scenes, 
  currentTime, 
  duration, 
  onSeek, 
  onUpdateScenes,
  isPlaying, 
  onTogglePlay, 
  onToggleFullScreen,
  isMobile,
  assets = []
}: TimelineProps) {
  const [zoom, setZoom] = useState(20); // pixels per second
  const [isDragging, setIsDragging] = useState(false);
  const [resizingSceneId, setResizingSceneId] = useState<string | null>(null);
  const [draggingSceneId, setDraggingSceneId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [isDraggingFileOver, setIsDraggingFileOver] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Auto-scroll timeline to keep playhead in view
  useEffect(() => {
    if (isPlaying && timelineRef.current && !isDragging && !resizingSceneId) {
      const container = timelineRef.current;
      const playheadPos = currentTime * zoom;
      const scrollPos = container.scrollLeft;
      const viewWidth = container.clientWidth;

      if (playheadPos > scrollPos + viewWidth * 0.8 || playheadPos < scrollPos) {
        container.scrollTo({
          left: playheadPos - viewWidth * 0.2,
          behavior: 'smooth'
        });
      }
    }
  }, [currentTime, isPlaying, zoom, isDragging, resizingSceneId]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
    setIsDragging(true);
    handleSeek(e);
  };

  const handleResizeStart = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setResizingSceneId(id);
  };

  const handleDragStart = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedSceneId(id);
    const scene = scenes.find(s => s.id === id);
    if (scene && timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left + timelineRef.current.scrollLeft - 24;
      setDragOffset((mouseX / zoom) - scene.startTime);
      setDraggingSceneId(id);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      handleSeek(e);
    } else if (resizingSceneId) {
      handleResize(e);
    } else if (draggingSceneId) {
      handleSceneMove(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setResizingSceneId(null);
    setDraggingSceneId(null);
  };

  useEffect(() => {
    if (isDragging || resizingSceneId || draggingSceneId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, resizingSceneId, draggingSceneId]);

  const handleSeek = (e: React.MouseEvent | MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft - 24;
    const newTime = Math.max(0, Math.min(duration || 0.1, x / zoom));
    onSeek(newTime);
  };

  const handleResize = (e: MouseEvent) => {
    if (!timelineRef.current || !resizingSceneId) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft - 24;
    
    const targetScene = scenes.find(s => s.id === resizingSceneId);
    if (!targetScene) return;

    const newDuration = Math.max(0.1, (x / zoom) - targetScene.startTime);
    const newScenes = scenes.map(s => s.id === resizingSceneId ? { ...s, duration: newDuration } : s);
    onUpdateScenes(newScenes);
  };

  const handleSceneMove = (e: MouseEvent) => {
    if (!timelineRef.current || !draggingSceneId) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left + timelineRef.current.scrollLeft - 24;
    
    let newStartTime = Math.max(0, (mouseX / zoom) - dragOffset);
    
    // Simple snapping logic (optional, can be improved)
    const snapThreshold = 0.15; // seconds
    for (const other of scenes) {
      if (other.id === draggingSceneId) continue;
      // Snap to end of another scene
      if (Math.abs(newStartTime - (other.startTime + other.duration)) < snapThreshold) {
        newStartTime = other.startTime + other.duration;
        break;
      }
      // Snap to start of another scene
      if (Math.abs((newStartTime + (scenes.find(s => s.id === draggingSceneId)?.duration || 0)) - other.startTime) < snapThreshold) {
        newStartTime = other.startTime - (scenes.find(s => s.id === draggingSceneId)?.duration || 0);
        break;
      }
    }

    const newScenes = scenes.map(s => s.id === draggingSceneId ? { ...s, startTime: newStartTime } : s);
    onUpdateScenes(newScenes);
  };

  const handleSplit = () => {
    // Find all scenes at current playhead
    const targetScenes = scenes.filter(s => currentTime > s.startTime && currentTime < s.startTime + s.duration);
    if (targetScenes.length === 0) return;

    // Prioritize selected scene, otherwise split the one on the highest track
    const sceneToSplit = targetScenes.find(s => s.id === selectedSceneId) || 
                       targetScenes.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))[0];

    const leftDuration = currentTime - sceneToSplit.startTime;
    const rightDuration = sceneToSplit.duration - leftDuration;

    if (leftDuration < 0.1 || rightDuration < 0.1) return; // Too small to split

    const firstHalf: Scene = { ...sceneToSplit, duration: leftDuration };
    const secondHalf: Scene = { 
      ...sceneToSplit, 
      id: `scene_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      startTime: currentTime, 
      duration: rightDuration 
    };

    const newScenes = scenes.reduce((acc: Scene[], s) => {
      if (s.id === sceneToSplit.id) {
        acc.push(firstHalf, secondHalf);
      } else {
        acc.push(s);
      }
      return acc;
    }, []);

    onUpdateScenes(newScenes);
    setSelectedSceneId(secondHalf.id);
  };

  const handleDeleteScene = () => {
    if (!selectedSceneId) return;
    const newScenes = scenes.filter(s => s.id !== selectedSceneId);
    onUpdateScenes(newScenes);
    setSelectedSceneId(null);
  };

  const handleUpdateVolume = (id: string, volume: number) => {
    const newScenes = scenes.map(s => {
      if (s.id === id) {
        return { ...s, volume };
      }
      return s;
    });
    onUpdateScenes(newScenes);
  };

  const formatTime = (seconds: number, compact?: boolean) => {
    if (isNaN(seconds) || seconds === undefined) return compact ? '00:00' : '00:00.00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    
    if (isMobile || compact) {
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const getMediaDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const type = file.type.startsWith('video/') ? 'video' : 'audio';
      const el = document.createElement(type);
      el.preload = 'metadata';
      el.onloadedmetadata = () => {
        URL.revokeObjectURL(el.src);
        resolve(el.duration);
      };
      el.onerror = () => resolve(type === 'video' ? 5 : 30); // Fallback
      el.src = URL.createObjectURL(file);
    });
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFileOver(false);
    if (!e.dataTransfer.files || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const dropX = e.clientX - rect.left + timelineRef.current.scrollLeft - 24;
    const dropTime = Math.max(0, dropX / zoom);
    
    const files = Array.from(e.dataTransfer.files);
    let currentDropTime = dropTime;
    const addedScenes: Scene[] = [];

    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      
      if (!isImage && !isVideo && !isAudio) continue;

      let type: Asset['type'] = isImage ? 'image' : isVideo ? 'video' : 'audio';
      
      const assetId = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newAsset: Asset = {
        id: assetId,
        name: file.name,
        type,
        url: '', // Will be populated by library refresh
        createdAt: Date.now()
      };

      if (type === 'audio') {
        try { newAsset.peaks = await extractPeaks(file, 40); } catch (err) { console.error(err); }
      } else if (type === 'video') {
        try { newAsset.thumbnail = await captureVideoThumbnail(file); } catch (err) { console.error(err); }
      }

      // 1. Save to Local DB (IndexedDB)
      await saveAsset(newAsset, file);

      // 2. Force library refresh to generate stable URL
      const refreshedAssets = await getAssets(true);
      const savedAsset = refreshedAssets.find(a => a.id === assetId);

      if (savedAsset) {
        let duration = 5;
        if (type === 'video' || type === 'audio') {
          duration = await getMediaDuration(file);
        }

        // 3. Create scene only after we have a stable URL
        const newScene: Scene = {
          id: `scene_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          text: file.name,
          duration: duration,
          startTime: currentDropTime,
          zIndex: type === 'audio' ? -1 : (Math.max(0, ...scenes.filter(s => s.type !== 'audio').map(s => s.zIndex || 0)) + 1),
          type,
          assetId: savedAsset.id,
          background: type === 'image' || type === 'video' ? 'transparent' : undefined
        };

        addedScenes.push(newScene);
        currentDropTime += newScene.duration;
      }
    }

    if (addedScenes.length > 0) {
      onUpdateScenes([...scenes, ...addedScenes]);
    }
  };

  return (
    <div style={{ 
      height: isMobile ? '180px' : '220px', 
      background: 'var(--bg-secondary)', 
      borderTop: '2px solid var(--border-strong)',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
      position: 'relative'
    }}>
      {isDraggingFileOver && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--brand-accent-soft)',
          border: '4px dashed var(--brand-accent)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <div style={{ background: 'var(--bg-primary)', padding: '20px 40px', border: '2px solid var(--brand-accent)', fontWeight: 800, fontSize: '18px', color: 'var(--brand-accent)' }}>
            DROP MEDIA TO TIMELINE
          </div>
        </div>
      )}
      {/* Controls Bar */}
      <div style={{ 
        height: '48px', 
        borderBottom: '2px solid var(--border-strong)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '0 24px',
        background: 'var(--bg-primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '20px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => onSeek(Math.max(0, currentTime - 5))} className="btn-secondary" style={{ padding: '6px' }}><SkipBack size={16} /></button>
            <button 
              onClick={onTogglePlay} 
              className="btn-primary"
              style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }}
            >
              {isPlaying ? <Pause size={16} fill="var(--bg-primary)" /> : <Play size={16} fill="var(--bg-primary)" style={{marginLeft: '2px'}} />}
            </button>
            <button onClick={() => onSeek(Math.min(duration, currentTime + 5))} className="btn-secondary" style={{ padding: '6px' }}><SkipForward size={16} /></button>
          </div>
          
          <div style={{ 
            background: 'var(--bg-secondary)', 
            padding: '4px 12px', 
            border: '1px solid var(--border-strong)',
            fontFamily: 'monospace'
          }}>
            <span style={{ fontSize: '13px', color: 'var(--brand-accent)', fontWeight: 800 }}>
              {formatTime(currentTime)}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginLeft: '6px', fontWeight: 600 }}>
              / {formatTime(duration)}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginLeft: '12px', borderLeft: '1px solid var(--border-strong)', paddingLeft: '16px' }}>
            <button 
              onClick={handleSplit}
              className="btn-secondary flex-center" 
              style={{ gap: '8px', fontSize: '11px', fontWeight: 700 }}
              title="Split at Playhead"
            >
              <Scissors size={14} /> SPLIT
            </button>
            <button 
              onClick={handleDeleteScene}
              disabled={!selectedSceneId}
              className="btn-secondary flex-center" 
              style={{ gap: '8px', fontSize: '11px', fontWeight: 700, color: selectedSceneId ? '#ef4444' : 'var(--text-tertiary)', borderColor: selectedSceneId ? 'rgba(239, 68, 68, 0.2)' : 'var(--border-strong)' }}
              title="Delete Selected"
            >
              <Trash2 size={14} /> DELETE
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px' }}>
          <div style={{ display: 'flex', background: 'var(--bg-accent)', padding: '2px', border: '1px solid var(--border-strong)' }}>
            <button onClick={() => setZoom(z => Math.max(10, z - 5))} style={{ padding: '4px', color: 'var(--text-secondary)' }} title="Zoom Out"><ZoomOut size={14} /></button>
            <button onClick={() => setZoom(z => Math.min(100, z + 5))} style={{ padding: '4px', color: 'var(--text-secondary)' }} title="Zoom In"><ZoomIn size={14} /></button>
          </div>
          <button style={{ color: 'var(--text-secondary)' }}><Volume2 size={16} /></button>
          <button onClick={onToggleFullScreen} style={{ color: 'var(--text-secondary)' }}><Maximize size={16} /></button>
        </div>
      </div>

      {/* Tracks Area */}
      <div 
        ref={timelineRef}
        onMouseDown={handleMouseDown}
        onClick={() => setSelectedSceneId(null)}
        onDragOver={(e) => { e.preventDefault(); setIsDraggingFileOver(true); }}
        onDragLeave={() => setIsDraggingFileOver(false)}
        onDrop={handleFileDrop}
        style={{ 
          flex: 1, 
          overflowX: 'auto', 
          overflowY: 'auto',
          position: 'relative',
          background: 'var(--bg-primary)',
          cursor: isDragging || draggingSceneId ? 'grabbing' : 'default'
        }}
      >
        <div style={{ 
          width: `${Math.max(duration * zoom, 1) + 200}px`, 
          height: '100%', 
          position: 'relative'
        }}>
          {/* Ruler */}
          <div style={{ 
            height: '32px', 
            borderBottom: '1px solid var(--border-strong)', 
            position: 'relative',
            background: 'var(--bg-secondary)',
            zIndex: 10
          }}>
            {Array.from({ length: Math.ceil(duration || 10) + 1 }).map((_, i) => (
              <div key={i} style={{ 
                position: 'absolute', 
                left: `${(i * zoom) + 24}px`, 
                bottom: 0, 
                width: '1px', 
                height: i % 5 === 0 ? '12px' : '6px', 
                background: i % 5 === 0 ? 'var(--text-tertiary)' : 'var(--border-strong)' 
              }}>
                {i % 5 === 0 && (
                  <span style={{ 
                    position: 'absolute', 
                    bottom: '16px', 
                    left: '4px', 
                    fontSize: '10px', 
                    color: 'var(--text-tertiary)', 
                    fontWeight: 700,
                    fontFamily: 'monospace'
                  }}>{i}s</span>
                )}
              </div>
            ))}
          </div>

          {/* Visual Tracks */}
          {Array.from({ length: Math.max(1, Math.max(0, ...scenes.filter(s => s.type !== 'audio').map(s => s.zIndex || 0)) + 1) }).map((_, trackIndex) => (
            <div key={`track-v-${trackIndex}`} style={{ 
              height: '64px', 
              background: 'transparent', 
              border: '1px solid var(--border-strong)',
              borderTop: 'none',
              position: 'relative',
              margin: '0 20px 0 0',
              backgroundImage: 'linear-gradient(90deg, var(--border-strong) 1px, transparent 1px)',
              backgroundSize: `${zoom}px 100%`,
              backgroundPosition: '24px 0'
            }}>
              <div style={{ position: 'absolute', left: 4, top: 4, fontSize: '9px', color: 'var(--text-tertiary)', fontWeight: 800, zIndex: 5 }}>V{trackIndex + 1}</div>
              {scenes.filter(s => s.type !== 'audio' && (s.zIndex || 0) === trackIndex).map((scene) => (
                <TimelineScene 
                  key={scene.id} 
                  scene={scene} 
                  assets={assets} 
                  zoom={zoom} 
                  resizingSceneId={resizingSceneId} 
                  onResizeStart={handleResizeStart} 
                  onUpdateVolume={handleUpdateVolume}
                  isSelected={selectedSceneId === scene.id}
                  onSelect={setSelectedSceneId}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>
          ))}

          {/* Audio Tracks */}
          <div style={{ 
            height: '64px', 
            background: 'rgba(16, 185, 129, 0.05)', 
            border: '1px solid var(--border-strong)',
            borderTop: '2px solid #10b981',
            position: 'relative',
            margin: '20px 20px 0 0',
            backgroundImage: 'linear-gradient(90deg, var(--border-strong) 1px, transparent 1px)',
            backgroundSize: `${zoom}px 100%`,
            backgroundPosition: '24px 0'
          }}>
            <div style={{ position: 'absolute', left: 4, top: 4, fontSize: '9px', color: '#10b981', fontWeight: 800, zIndex: 5 }}>A1 (MUSIC)</div>
            {scenes.filter(s => s.type === 'audio' || (s.zIndex !== undefined && s.zIndex < 0)).map((scene) => (
              <TimelineScene 
                key={scene.id} 
                scene={scene} 
                assets={assets} 
                zoom={zoom} 
                resizingSceneId={resizingSceneId} 
                onResizeStart={handleResizeStart} 
                onUpdateVolume={handleUpdateVolume}
                isSelected={selectedSceneId === scene.id}
                onSelect={setSelectedSceneId}
                onDragStart={handleDragStart}
              />
            ))}
          </div>

          {/* Playhead */}
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: `${(currentTime * zoom) + 24}px`, 
            width: '2px', 
            height: '100%', 
            background: 'var(--brand-accent)',
            zIndex: 100,
            pointerEvents: 'none'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: '-6px', 
              width: '14px', 
              height: '14px', 
              background: 'var(--brand-accent)', 
              borderRadius: '0',
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)'
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}
