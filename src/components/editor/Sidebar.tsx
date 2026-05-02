import { useState, useRef } from 'react';
import { Type, Layers, Image as ImageIcon, Film, Music, Upload, Trash2, Plus, Play, Search as SearchIcon, Download, Loader2 } from 'lucide-react';
import { saveAsset, deleteAsset } from '../../utils/db';
import { extractPeaks } from '../../utils/audio';
import { searchMedia, downloadMedia } from '../../services/mediaService';
import type { SearchResult } from '../../services/mediaService';
import type { Asset, Scene } from '../../types/video';

const TABS = [
  { id: 'search', icon: SearchIcon, label: 'Stock Search' },
  { id: 'scripts', icon: Type, label: 'Scripts' },
  { id: 'components', icon: Layers, label: 'UI Library' },
  { id: 'assets', icon: ImageIcon, label: 'Images' },
  { id: 'media', icon: Film, label: 'Video' },
  { id: 'audio', icon: Music, label: 'Audio' }
];

interface SidebarProps {
  width: number;
  isMobile?: boolean;
  onAddAsset?: (asset: Asset) => void;
  scenes?: Scene[];
  assets?: Asset[];
}

export default function Sidebar({ width, isMobile, onAddAsset, scenes = [], assets = [] }: SidebarProps) {
  const [activeTab, setActiveTab] = useState('search');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'image' | 'video' | 'audio'>('image');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchError(null);
    try {
      const results = await searchMedia(searchQuery, searchType);
      setSearchResults(results);
    } catch (err: any) {
      setSearchError(err.message || 'Search failed. Please check your API keys.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownload = async (result: SearchResult) => {
    setDownloadingId(result.id);
    setDownloadProgress(0);
    const asset = await downloadMedia(result, (p) => setDownloadProgress(p));
    setDownloadingId(null);
    setDownloadProgress(0);
    if (asset) {
      // Switch to the relevant tab to show the new asset
      const targetTab = asset.type === 'image' ? 'assets' : asset.type === 'video' ? 'media' : 'audio';
      setActiveTab(targetTab);
    }
  };

  const toggleAudioPreview = (asset: Asset | SearchResult) => {
    if (playingAudioId === asset.id) {
      audioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioRef.current) {
        console.log(`Playing audio: ${asset.name} from ${asset.url}`);
        audioRef.current.src = asset.url;
        audioRef.current.play().catch(err => {
          console.error('Audio playback failed:', err);
          setPlayingAudioId(null);
        });
        setPlayingAudioId(asset.id);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let type: Asset['type'] = 'image';
    if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'audio';
    else if (file.name.endsWith('.txt')) type = 'script';

    const newAsset: Asset = {
      id: `asset_${Date.now()}`,
      name: file.name,
      type,
      url: '', 
      createdAt: Date.now()
    };

    if (type === 'audio') {
      try {
        newAsset.peaks = await extractPeaks(file, 40);
      } catch (err) {
        console.error('Failed to extract peaks:', err);
      }
    }

    await saveAsset(newAsset, file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={{ 
      width: isMobile ? '100%' : `${width}px`, 
      borderRight: isMobile ? 'none' : '1px solid var(--border-strong)', 
      display: 'flex',
      flexDirection: 'row',
      background: 'var(--bg-secondary)',
      height: '100%'
    }}>
      <audio 
        ref={audioRef} 
        onEnded={() => setPlayingAudioId(null)}
        style={{ display: 'none' }}
      />
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept={activeTab === 'assets' ? 'image/*' : activeTab === 'media' ? 'video/*' : 'audio/*'} 
        onChange={handleFileUpload}
      />
      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        padding: '0', 
        borderRight: '1px solid var(--border-strong)',
        overflowX: 'hidden',
        overflowY: 'auto',
        background: 'var(--bg-primary)',
        width: '48px',
        flexShrink: 0
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              style={{
                flex: 'none',
                padding: '16px 0',
                borderRadius: '0',
                background: isActive ? 'var(--brand-accent)' : 'transparent',
                color: isActive ? 'var(--bg-primary)' : 'var(--text-secondary)',
                borderBottom: '1px solid var(--border-strong)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '100%',
                transition: 'all var(--transition-fast)'
              }}
            >
              <Icon size={20} strokeWidth={isActive ? 3 : 2} />
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '24px', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {TABS.find(t => t.id === activeTab)?.label}
        </h3>

        {activeTab === 'search' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-secondary)', padding: '4px', border: '1px solid var(--border-strong)' }}>
                {(['image', 'video', 'audio'] as const).map(type => (
                  <button 
                    key={type}
                    type="button"
                    onClick={() => setSearchType(type)}
                    style={{ 
                      flex: 1, 
                      fontSize: '10px', 
                      padding: '6px', 
                      background: searchType === type ? 'var(--brand-accent)' : 'transparent',
                      color: searchType === type ? 'var(--bg-primary)' : 'var(--text-secondary)'
                    }}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search for ${searchType}s...`}
                  style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', padding: '10px', fontSize: '12px' }}
                />
                <button type="submit" className="btn-primary" style={{ padding: '0 16px' }}>
                  {isSearching ? <Loader2 size={16} className="animate-spin" /> : <SearchIcon size={16} />}
                </button>
              </div>
            </form>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {searchResults.map(result => (
                <div key={result.id} className="panel" style={{ overflow: 'hidden', position: 'relative' }}>
                  <img src={result.previewUrl} style={{ width: '100%', height: '80px', objectFit: 'cover', opacity: downloadingId === result.id ? 0.3 : 1 }} />
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {result.type === 'audio' && (
                        <button 
                          onClick={() => toggleAudioPreview(result)}
                          style={{ 
                            flex: 'none',
                            padding: '8px',
                            background: playingAudioId === result.id ? 'var(--brand-accent)' : 'var(--bg-tertiary)',
                            color: playingAudioId === result.id ? 'var(--bg-primary)' : 'var(--text-primary)',
                            border: '1px solid var(--border-strong)'
                          }}
                        >
                          {playingAudioId === result.id ? <div style={{ width: '12px', height: '12px', background: 'currentColor' }} /> : <Play size={12} fill="currentColor" />}
                        </button>
                      )}
                      <button 
                        onClick={() => handleDownload(result)}
                        disabled={!!downloadingId}
                        style={{ 
                          flex: 1,
                          fontSize: '9px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '6px',
                          color: downloadingId === result.id ? 'var(--brand-accent)' : 'var(--text-primary)',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-strong)',
                          padding: '8px'
                        }}
                      >
                        {downloadingId === result.id ? (
                          <div style={{ width: '100%' }}>
                            <div style={{ height: '2px', background: 'var(--brand-accent)', width: `${downloadProgress}%`, transition: 'width 0.1s' }} />
                            <span style={{ fontSize: '8px', display: 'block', marginTop: '4px' }}>{downloadProgress}%</span>
                          </div>
                        ) : (
                          <><Download size={12} /> {result.type === 'audio' ? 'SAVE' : 'DOWNLOAD'}</>
                        )}
                      </button>
                    </div>
                  </div>
              ))}
            </div>
            
            {searchError && (
              <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', fontSize: '11px', fontWeight: 700 }}>
                {searchError}
              </div>
            )}
            
            {searchResults.length === 0 && !isSearching && !searchError && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p className="content-serif" style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Search above to find free stock media from Pexels & Pixabay.</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'scripts' && (() => {
          const scripts = assets.filter(a => a.type === 'script');
          
          const formatTime = (seconds: number) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
          };

          const fullScriptText = scenes
            .sort((a, b) => a.startTime - b.startTime)
            .map((s, i) => `SCENE ${i + 1} [${formatTime(s.startTime)}]\n${s.text}`)
            .join('\n\n');
          
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--brand-accent)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', borderBottom: '1px solid var(--border-strong)', paddingBottom: '4px' }}>
                  Professional Project Script
                </div>
                {scenes.length > 0 ? (
                  <div className="panel" style={{ padding: '0', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', overflow: 'hidden' }}>
                    <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '16px' }}>
                      {scenes.sort((a, b) => a.startTime - b.startTime).map((scene, i) => (
                        <div key={scene.id} style={{ marginBottom: '20px', borderLeft: '2px solid var(--brand-accent)', paddingLeft: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--brand-accent)' }}>SCENE {i + 1}</span>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)' }}>
                              [{formatTime(scene.startTime)}] &bull; {scene.duration}s
                            </span>
                          </div>
                          <p style={{ 
                            fontSize: '13px', 
                            color: 'var(--text-primary)', 
                            margin: 0, 
                            fontFamily: 'Lora, serif', 
                            lineHeight: 1.5,
                            fontStyle: scene.type === 'audio' ? 'italic' : 'normal'
                          }}>
                            {scene.text || '(No dialogue)'}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-strong)' }}>
                      <button 
                        onClick={() => navigator.clipboard.writeText(fullScriptText)}
                        className="btn-secondary"
                        style={{ width: '100%', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', padding: '8px' }}
                      >
                        Copy Full Screenplay
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="content-serif" style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Add scenes to see the script here.</p>
                )}
              </div>

              <div>
                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', borderBottom: '1px solid var(--border-strong)', paddingBottom: '4px' }}>
                  Global Script Library
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary" 
                  style={{ fontSize: '11px', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', marginBottom: '12px' }}
                >
                  <Upload size={14} /> UPLOAD NEW (.TXT)
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {scripts.length === 0 ? (
                    <div className="panel" style={{ 
                      padding: '24px 16px', 
                      border: '1px dashed var(--border-strong)',
                      textAlign: 'center',
                      fontSize: '11px',
                      color: 'var(--text-tertiary)'
                    }}>
                      No external scripts uploaded.
                    </div>
                  ) : (
                    scripts.map(script => (
                      <div key={script.id} className="panel" style={{ padding: '12px', border: '1px solid var(--border-strong)', background: 'var(--bg-primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>{script.name}</span>
                          <button onClick={async () => { await deleteAsset(script.id); }} style={{ color: 'var(--text-tertiary)' }}><Trash2 size={12} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === 'components' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {['Text Slide', 'Title Card', 'Bullet Points', 'Caption'].map(comp => (
              <div key={comp} className="panel" style={{ 
                padding: '16px 8px', 
                fontSize: '11px', 
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                textAlign: 'center',
                cursor: 'grab',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-strong)'
              }}>
                {comp}
              </div>
            ))}
          </div>
        )}

        {['assets', 'media', 'audio'].includes(activeTab) && (() => {
          const expectedType = activeTab === 'assets' ? 'image' : activeTab === 'media' ? 'video' : 'audio';
          const filteredAssets = assets.filter(a => a.type === expectedType);

          const usedAssets = filteredAssets.filter(a => scenes.some(s => s.assetId === a.id));
          const unusedAssets = filteredAssets.filter(a => !scenes.some(s => s.assetId === a.id));

          const AssetCard = ({ asset }: { asset: Asset }) => {
            const isPlaying = playingAudioId === asset.id;
            
            return (
              <div className="panel" style={{ padding: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-primary)' }}>
                {asset.type === 'image' && <img src={asset.url} style={{ width: '100%', height: '80px', objectFit: 'cover', marginBottom: '8px', border: '1px solid var(--border-strong)' }} />}
                {asset.type === 'video' && <video src={asset.url} style={{ width: '100%', height: '80px', objectFit: 'cover', marginBottom: '8px', border: '1px solid var(--border-strong)' }} />}
                {asset.type === 'audio' && (
                  <div 
                    style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      alignItems: 'center', 
                      height: '40px', 
                      padding: '8px', 
                      background: 'var(--bg-secondary)', 
                      border: '1px solid var(--border-strong)', 
                      marginBottom: '8px',
                    }}
                  >
                    {isPlaying ? (
                      <div 
                        onClick={(e) => { e.stopPropagation(); toggleAudioPreview(asset); }}
                        style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <div style={{ width: '12px', height: '12px', background: 'var(--brand-accent)' }} />
                      </div>
                    ) : (
                      <Play 
                        onClick={(e: any) => { e.stopPropagation(); toggleAudioPreview(asset); }}
                        size={16} 
                        color="var(--brand-accent)" 
                        style={{ flexShrink: 0, cursor: 'pointer' }} 
                      />
                    )}
                    <div style={{ flex: 1, height: '100%', position: 'relative', display: 'flex', alignItems: 'center' }}>
                      {isPlaying && (
                        <div 
                          style={{ 
                            position: 'absolute', 
                            top: 0, 
                            left: `${(audioProgress / audioDuration) * 100}%`, 
                            width: '2px', 
                            height: '100%', 
                            background: 'var(--brand-accent)',
                            zIndex: 10,
                            boxShadow: '0 0 10px var(--brand-accent)',
                            pointerEvents: 'none'
                          }} 
                        />
                      )}
                      <div 
                        onClick={(e) => {
                          if (!isPlaying) {
                            toggleAudioPreview(asset);
                            return;
                          }
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const pct = x / rect.width;
                          if (audioRef.current) {
                            audioRef.current.currentTime = pct * audioDuration;
                          }
                        }}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1px', height: '100%', cursor: 'pointer' }}
                      >
                        {(asset.peaks || Array.from({ length: 20 }).map(() => 0.5)).map((peak, i) => (
                          <div 
                            key={i} 
                            style={{ 
                              flex: 1, 
                              background: isPlaying ? 'var(--brand-accent)' : 'var(--text-tertiary)', 
                              height: `${Math.max(10, peak * 100)}%`, 
                              minHeight: '2px',
                              transition: 'all 0.2s',
                              pointerEvents: 'none'
                            }} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100px' }}>{asset.name}</span>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button onClick={() => onAddAsset?.(asset)} style={{ color: 'var(--brand-accent)' }} title="Add to Timeline"><Plus size={16} strokeWidth={3} /></button>
                    <button onClick={async () => { await deleteAsset(asset.id); }} style={{ color: 'var(--text-tertiary)' }} title="Delete Asset"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            );
          };

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary" 
                style={{ fontSize: '11px', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexShrink: 0 }}
              >
                <Upload size={14} /> UPLOAD {activeTab.toUpperCase()}
              </button>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {usedAssets.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--brand-accent)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', borderBottom: '1px solid var(--border-strong)', paddingBottom: '4px' }}>In Use (Project)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {usedAssets.map(asset => <AssetCard key={asset.id} asset={asset} />)}
                    </div>
                  </div>
                )}
                
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', borderBottom: '1px solid var(--border-strong)', paddingBottom: '4px' }}>Global Library</div>
                  {unusedAssets.length === 0 ? (
                     <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-tertiary)' }}>
                       <p className="content-serif" style={{ fontSize: '13px', fontStyle: 'italic' }}>No other {activeTab} available.</p>
                     </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {unusedAssets.map(asset => <AssetCard key={asset.id} asset={asset} />)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
      <audio 
        ref={audioRef} 
        style={{ display: 'none' }} 
        onEnded={() => {
          setPlayingAudioId(null);
          setAudioProgress(0);
        }}
        onTimeUpdate={(e) => setAudioProgress((e.target as HTMLAudioElement).currentTime)}
        onLoadedMetadata={(e) => setAudioDuration((e.target as HTMLAudioElement).duration)}
      />
    </div>
  );
}

