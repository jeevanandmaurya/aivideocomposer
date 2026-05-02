import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ExportWorker from '../workers/exportWorker?worker';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Download, Layers, Film, Terminal, X, Loader2 } from 'lucide-react';
import Sidebar from '../components/editor/Sidebar';
import Timeline from '../components/editor/Timeline';
import AIChat from '../components/editor/AIChat';
import Canvas from '../components/editor/Canvas';
import { getAssets } from '../utils/db';
import type { VideoProject, Asset } from '../types/video';
import rawExamples from '../data/examples.json';

// Parse examples from JSON file (simulating AI response parsing)
export const EXAMPLES: VideoProject[] = rawExamples as VideoProject[];

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<VideoProject | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState('1080p');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [globalAssets, setGlobalAssets] = useState<Asset[]>([]);
  const [selectedFps, setSelectedFps] = useState<30 | 60>(30);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [chatWidth, setChatWidth] = useState(350);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingChat, setIsResizingChat] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [activeTab, setActiveTab] = useState<'edit' | 'timeline' | 'chat'>('edit');

  const workerRef = useRef<Worker | null>(null);
  const cancelExportRef = useRef(false);

  const [lastSaved, setLastSaved] = useState<number>(Date.now());

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar) {
        setSidebarWidth(Math.max(200, Math.min(500, e.clientX)));
      }
      if (isResizingChat) {
        setChatWidth(Math.max(250, Math.min(600, window.innerWidth - e.clientX)));
      }
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      setIsResizingChat(false);
    };

    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    if (isResizingSidebar || isResizingChat) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
    };
  }, [isResizingSidebar, isResizingChat]);

  useEffect(() => {
    // Reset player state when switching projects
    setCurrentTime(0);
    setIsPlaying(false);

    // Check examples first
    const example = EXAMPLES.find(e => e.id === id);
    if (example) {
      setProject(example);
      return;
    }

    const saved = localStorage.getItem('user_projects');
    if (saved) {
      const projects: VideoProject[] = JSON.parse(saved);
      const found = projects.find(p => p.id === id);
      if (found) setProject(found);
    }
  }, [id]);

  // Auto-save logic
  useEffect(() => {
    if (!project || id?.startsWith('ex-')) return;
    
    const timeout = setTimeout(() => {
      const saved = localStorage.getItem('user_projects');
      if (saved) {
        const projects: VideoProject[] = JSON.parse(saved);
        const updated = projects.map(p => p.id === project.id ? project : p);
        localStorage.setItem('user_projects', JSON.stringify(updated));
        setLastSaved(Date.now());
      }
    }, 2000); // Save after 2 seconds of no changes

    return () => clearTimeout(timeout);
  }, [project, id]);

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

  useEffect(() => {
    if (isExporting) {
      document.title = `[${exportProgress}%] Exporting...`;
    } else {
      document.title = project ? `${project.name} - AI Video Composer` : 'AI Video Composer';
    }
  }, [isExporting, exportProgress, project]);

  const handleAspectRatioChange = (newRatio: '16:9' | '9:16') => {
    if (project?.scenes.length && project.scenes.length > 0) {
      const confirmChange = window.confirm("WARNING: Changing the aspect ratio mid-edit may cause text or background elements to overflow or look distorted. Do you want to continue?");
      if (!confirmChange) return;
    }
    setProject(p => p ? { ...p, aspectRatio: newRatio } : null);
  };

  const handleAddAssetToTimeline = (asset: any) => {
    if (!project) return;
    const maxZIndex = project.scenes.length > 0 ? Math.max(0, ...project.scenes.map(s => s.zIndex || 0)) : -1;
    const newScene = {
      id: `scene_${Date.now()}`,
      text: asset.name,
      duration: 5,
      startTime: currentTime,
      zIndex: maxZIndex + 1,
      type: asset.type,
      assetId: asset.id
    };
    setProject({
      ...project,
      scenes: [...project.scenes, newScene]
    });
  };

  // Real Hardware-Accelerated Export Logic
  const startRealExport = async () => {
    if (!project) return;
    
    setIsExporting(true);
    setExportProgress(0);
    setIsPlaying(false);
    cancelExportRef.current = false;

    // Set resolution based on selection
    const resMap: Record<string, { w: number, h: number }> = {
      '720p': { w: 1280, h: 720 },
      '1080p': { w: 1920, h: 1080 },
      '4k': { w: 3840, h: 2160 }
    };
    let { w, h } = resMap[selectedResolution] || resMap['1080p'];
    
    if (project.aspectRatio === '9:16') {
      const temp = w;
      w = h;
      h = temp;
    }

    const fps = selectedFps;
    const totalDuration = duration;
    const totalFrames = Math.ceil(totalDuration * fps);
    const codec = selectedResolution === '4k' ? 'avc1.640034' : 'avc1.4d002a';

    // 1. Initialize Worker
    const worker = new ExportWorker();
    workerRef.current = worker;

    const waitForMessage = (type: string) => new Promise<any>(resolve => {
      const handler = (e: MessageEvent) => {
        if (e.data.type === type) {
          worker.removeEventListener('message', handler);
          resolve(e.data);
        }
      };
      worker.addEventListener('message', handler);
    });

    worker.postMessage({
      type: 'configure',
      data: { width: w, height: h, bitrate: selectedResolution === '4k' ? 25000000 : 8000000, codec, fps }
    });

    await waitForMessage('configured');

    worker.onmessage = (e) => {
      const { type, buffer, error } = e.data;
      if (type === 'complete' && buffer) {
        const blob = new Blob([buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${project.name.replace(/\s+/g, '_')}_${selectedResolution}.mp4`;
        link.click();
        URL.revokeObjectURL(url);
        finishExport("Export Complete! Your video has been saved as MP4.");
      } else if (type === 'error') {
        alert("Export Error: " + error);
        finishExport();
      }
    };

    const finishExport = (msg?: string) => {
      setIsExporting(false);
      setIsExportModalOpen(false);
      setExportProgress(0);
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (msg) alert(msg);
    };

    // 2. SVG foreignObject Rendering Logic
    const htmlToImage = (html: string, width: number, height: number): Promise<HTMLImageElement> => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="text-rendering: geometricPrecision; shape-rendering: geometricPrecision;">
          <foreignObject width="100%" height="100%" style="overflow: visible;">
            <div xmlns="http://www.w3.org/1999/xhtml" style="width: 100%; height: 100%; container-type: inline-size; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
              ${html}
            </div>
          </foreignObject>
        </svg>
      `;
      
      const base64 = btoa(unescape(encodeURIComponent(svg)));
      const url = `data:image/svg+xml;base64,${base64}`;

      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = async () => {
          try {
            if ('decode' in img) await img.decode();
            resolve(img);
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = () => {
          reject(new Error(`Failed to render SVG frame`));
        };
        img.src = url;
      });
    };

    const getSceneHtml = (scene: any, time: number) => {
      const transitionDuration = Math.min(0.5, scene.duration / 2);
      const sceneElapsed = time - scene.startTime;
      const sceneRemaining = (scene.startTime + scene.duration) - time;
      
      let opacity = 1;
      let scale = 1;

      if (sceneElapsed < transitionDuration) {
        const progress = sceneElapsed / transitionDuration;
        opacity = progress;
        scale = 0.95 + (0.05 * progress);
      } else if (sceneRemaining < transitionDuration) {
        const progress = 1 - (sceneRemaining / transitionDuration);
        opacity = 1 - progress;
        scale = 1 + (0.05 * progress);
      }

      const charCount = scene.text.length || 1;
      const fontSizeFactor = Math.max(3, Math.min(8.5, 350 / charCount));
      const fontSize = `${fontSizeFactor}vw`;

      return `
        <div style="
          width: 100%; 
          height: 100%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          background: ${scene.background || 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #050505 100%)'};
          color: white;
          font-family: Inter, system-ui, sans-serif;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          margin: 0;
          padding: 0;
          overflow: hidden;
        ">
          <style>
            * {
              animation-play-state: paused !important;
              animation-delay: -${time}s !important;
            }
          </style>
          <div style="
            text-align: center;
            padding: 8vw;
            opacity: ${opacity};
            transform: scale(${scale});
            width: 100%;
            box-sizing: border-box;
          ">
            ${scene.html ? scene.html : `
              <h2 style="
                font-size: ${fontSize};
                font-weight: 800;
                line-height: 1.1;
                margin: 0;
                text-shadow: 0 0.5vw 2vw rgba(0,0,0,0.8);
                word-wrap: break-word;
              ">${scene.text}</h2>
            `}
          </div>
        </div>
      `;
    };

    // 3. Main Export Loop
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = w;
    exportCanvas.height = h;
    const ctx = exportCanvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    
    ctx.imageSmoothingEnabled = false;

    for (let currentFrame = 0; currentFrame < totalFrames; currentFrame++) {
      if (cancelExportRef.current) {
        finishExport();
        return;
      }

      const time = currentFrame / fps;
      const scene = project.scenes.find(s => time >= s.startTime && time < s.startTime + s.duration);
      
      ctx.clearRect(0, 0, w, h);

      if (scene) {
        const html = getSceneHtml(scene, time);
        try {
          const img = await htmlToImage(html, w, h);
          ctx.drawImage(img, 0, 0);
          
          if (img.src.startsWith('blob:')) {
            URL.revokeObjectURL(img.src);
          }
        } catch (e) {
          console.error("Frame skip:", e);
        }
      }

      const bitmap = await createImageBitmap(exportCanvas);
      worker.postMessage({
        type: 'frame',
        data: { frameIndex: currentFrame, bitmap }
      }, [bitmap]);

      await waitForMessage('frame_done');

      if (currentFrame % 5 === 0 || currentFrame === totalFrames - 1) {
        setExportProgress(Math.round((currentFrame / totalFrames) * 100));
        setCurrentTime(time);
      }
    }

    worker.postMessage({ type: 'finalize' });
  };

  const handleCancelExport = () => {
    cancelExportRef.current = true;
  };

  const duration = project?.scenes && project.scenes.length > 0 
    ? project.scenes.reduce((acc, s) => acc + s.duration, 0) 
    : 0;

  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setCurrentTime(t => {
          if (t >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return t + 0.1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  if (!project) return <div className="flex-center" style={{ height: '100dvh' }}>Loading...</div>;

  return (
    <div className="app-container" style={{ flexDirection: 'column', height: '100dvh' }}>
      {/* Brutalist Header */}
      <header style={{ 
        height: 'var(--header-height)', 
        borderBottom: '2px solid var(--border-strong)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '0 24px',
        background: 'var(--bg-secondary)',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <button 
            onClick={() => navigate('/')} 
            className="btn-secondary flex-center hover-scale"
            style={{ width: '32px', height: '32px', padding: 0 }}
          >
            <ChevronLeft size={20} strokeWidth={3} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{project.name}</h1>
            <div style={{ width: '1px', height: '16px', background: 'var(--border-strong)' }} />
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
              ID: {project.id.slice(-6)} • SAVED {new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ 
            display: 'flex', 
            background: 'var(--bg-secondary)', 
            border: '1px solid var(--border-strong)',
            marginRight: isMobile ? '0' : '16px'
          }}>
            <button 
              onClick={() => handleAspectRatioChange('16:9')}
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 800,
                background: project?.aspectRatio !== '9:16' ? 'var(--brand-accent)' : 'transparent',
                color: project?.aspectRatio !== '9:16' ? 'var(--bg-primary)' : 'var(--text-secondary)'
              }}
            >16:9</button>
            <button 
              onClick={() => handleAspectRatioChange('9:16')}
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 800,
                background: project?.aspectRatio === '9:16' ? 'var(--brand-accent)' : 'transparent',
                color: project?.aspectRatio === '9:16' ? 'var(--bg-primary)' : 'var(--text-secondary)'
              }}
            >9:16</button>
          </div>
          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="btn-primary flex-center"
            style={{ gap: '8px', fontSize: '12px' }}
          >
            <Download size={16} strokeWidth={3} /> EXPORT
          </button>
        </div>
      </header>

      {/* Brutalist Export Modal */}
      <AnimatePresence>
        {isExportModalOpen && (
          <div style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(20, 20, 19, 0.9)', 
            backdropFilter: 'blur(8px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="panel" 
              style={{
                width: '100%',
                maxWidth: '480px',
                background: 'var(--bg-secondary)',
                padding: '40px',
                position: 'relative',
                border: '2px solid var(--border-strong)',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              {!isExporting && (
                <button 
                  onClick={() => setIsExportModalOpen(false)}
                  style={{ position: 'absolute', top: '24px', right: '24px', color: 'var(--text-tertiary)' }}
                  className="hover-scale"
                >
                  <X size={24} strokeWidth={3} />
                </button>
              )}

              <div style={{ borderBottom: '2px solid var(--border-strong)', paddingBottom: '24px', marginBottom: '32px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Export Masterpiece</h2>
                <p className="content-serif" style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>High-fidelity MP4 orchestration with hardware acceleration.</p>
              </div>

              {!isExporting ? (
                <div className="animate-fade-in">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
                    {[
                      { id: '720p', label: '720p HD', desc: 'Fast export, web optimized', specs: `1280x720 • ${selectedFps}fps` },
                      { id: '1080p', label: '1080p Full HD', desc: 'Studio quality, crisp details', specs: `1920x1080 • ${selectedFps}fps` },
                      { id: '4k', label: '4K Ultra HD', desc: 'Maximum cinematic fidelity', specs: `3840x2160 • ${selectedFps}fps` }
                    ].map(res => {
                      const isActive = selectedResolution === res.id;
                      return (
                        <button 
                          key={res.id}
                          onClick={() => setSelectedResolution(res.id)}
                          style={{
                            padding: '20px',
                            border: isActive ? '2px solid var(--brand-accent)' : '1px solid var(--border-strong)',
                            background: isActive ? 'var(--brand-accent-soft)' : 'transparent',
                            textAlign: 'left',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all var(--transition-fast)'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                              <span style={{ fontWeight: 800, color: isActive ? 'var(--brand-accent)' : 'var(--text-primary)', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{res.label}</span>
                              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--bg-primary)', background: isActive ? 'var(--brand-accent)' : 'var(--text-secondary)', padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{res.specs}</span>
                            </div>
                            <div className="content-serif" style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{res.desc}</div>
                          </div>
                          {isActive && <div style={{ width: '8px', height: '8px', background: 'var(--brand-accent)' }} />}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
                    {[30, 60].map(fps => (
                      <button
                        key={fps}
                        onClick={() => setSelectedFps(fps as 30 | 60)}
                        style={{
                          flex: 1,
                          padding: '12px',
                          border: selectedFps === fps ? '2px solid var(--brand-accent)' : '1px solid var(--border-strong)',
                          background: selectedFps === fps ? 'var(--brand-accent-soft)' : 'transparent',
                          color: selectedFps === fps ? 'var(--brand-accent)' : 'var(--text-primary)',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          transition: 'all var(--transition-fast)'
                        }}
                      >
                        {fps} FPS
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      onClick={() => setIsExportModalOpen(false)}
                      className="btn-secondary"
                      style={{ flex: 1, padding: '12px' }}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={startRealExport}
                      className="btn-primary"
                      style={{ flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <Download size={18} /> Start Export
                    </button>
                  </div>
                </div>
              ) : (
                <div className="animate-fade-in">
                  <div style={{ 
                    width: '100%', 
                    aspectRatio: '16/9', 
                    background: '#000', 
                    marginBottom: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                    border: '2px solid var(--border-strong)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Animated background pulse during export */}
                    <motion.div 
                      animate={{ opacity: [0.1, 0.3, 0.1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{ position: 'absolute', inset: 0, background: 'var(--brand-accent)' }} 
                    />
                    
                    <div className="flex-center" style={{ position: 'relative', zIndex: 1, flexDirection: 'column', gap: '12px' }}>
                      <Loader2 size={32} className="animate-spin" color="var(--brand-accent)" />
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', color: 'white', fontWeight: 600, display: 'block' }}>Rendering Frames</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Do not close this tab</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ height: '8px', background: 'var(--bg-accent)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${exportProgress}%` }}
                      style={{ height: '100%', background: 'var(--brand-accent)', boxShadow: '0 0 10px var(--brand-accent-soft)' }} 
                    />
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', alignItems: 'flex-end' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Status</span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{exportProgress < 100 ? 'Encoding MP4...' : 'Finalizing...'}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--brand-accent)', lineHeight: 1 }}>{exportProgress}%</span>
                    </div>
                  </div>
                  
                  <button onClick={handleCancelExport} className="btn-secondary" style={{ width: '100%', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)', padding: '10px' }}>
                    Cancel Export
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Main Layout */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        overflow: 'hidden'
      }}>
        {!isMobile && <Sidebar width={sidebarWidth} isMobile={isMobile} onAddAsset={handleAddAssetToTimeline} scenes={project?.scenes || []} assets={globalAssets} />}
        
        {!isMobile && (
          <div 
            onMouseDown={() => setIsResizingSidebar(true)}
            style={{
              width: '2px',
              cursor: 'col-resize',
              background: isResizingSidebar ? 'var(--brand-accent)' : 'transparent',
              transition: 'background 0.2s',
              zIndex: 10
            }}
          />
        )}

        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          background: 'var(--bg-primary)', 
          minWidth: 0,
          overflow: 'hidden' 
        }}>
          {(activeTab === 'edit' || activeTab === 'timeline' || !isMobile) && (
            <Canvas 
              scenes={project.scenes} 
              currentTime={currentTime} 
              duration={duration}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onSeek={setCurrentTime}
              isFullScreen={isFullScreen} 
              onToggleFullScreen={() => setIsFullScreen(!isFullScreen)} 
              aspectRatio={project.aspectRatio}
            />
          )}
          
          {(activeTab === 'timeline' || !isMobile) && (
            <Timeline 
              scenes={project.scenes} 
              currentTime={currentTime} 
              duration={duration}
              onSeek={setCurrentTime}
              onUpdateScenes={(newScenes) => setProject(p => p ? { ...p, scenes: newScenes } : null)}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
              isMobile={isMobile}
              assets={globalAssets}
            />
          )}

          {isMobile && activeTab === 'edit' && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <Sidebar width={window.innerWidth} isMobile={isMobile} onAddAsset={handleAddAssetToTimeline} scenes={project?.scenes || []} assets={globalAssets} />
            </div>
          )}
        </div>

        {!isMobile && (
          <div 
            onMouseDown={() => setIsResizingChat(true)}
            style={{
              width: '2px',
              cursor: 'col-resize',
              background: isResizingChat ? 'var(--brand-accent)' : 'transparent',
              transition: 'background 0.2s',
              zIndex: 10
            }}
          />
        )}

        {(activeTab === 'chat' || !isMobile) && (
          <AIChat 
            width={isMobile ? window.innerWidth : chatWidth}
            project={project}
            onUpdateProject={(updates) => setProject(p => p ? { ...p, ...updates } : null)} 
          />
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav style={{
          height: '56px',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-strong)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          paddingBottom: 'env(safe-area-inset-bottom)',
          zIndex: 100
        }}>
          {[
            { id: 'edit', label: 'Assets', icon: Layers },
            { id: 'timeline', label: 'Timeline', icon: Film },
            { id: 'chat', label: 'AI Agent', icon: Terminal }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                title={tab.label}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: isActive ? 'var(--brand-accent)' : 'var(--text-secondary)',
                  transition: 'all var(--transition-fast)',
                  position: 'relative'
                }}
              >
                {isActive && (
                  <motion.div 
                    layoutId="mobile-nav-active"
                    style={{ 
                      position: 'absolute', 
                      top: '-1px', 
                      width: '32px', 
                      height: '2px', 
                      background: 'var(--brand-accent)', 
                      borderRadius: '0' 
                    }} 
                  />
                )}
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} style={{ opacity: isActive ? 1 : 0.7 }} />
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}


