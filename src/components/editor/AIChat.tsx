import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Terminal, Loader2, ChevronDown, ChevronRight, Cpu, Search, Download, CheckCircle, XCircle, Music, Image as ImageIcon, Film } from 'lucide-react';
import { processAgentCommand } from '../../services/ai';
import { executeComposition } from '../../services/compositionEngine';
import type { CompositionPlan, CompositionStep } from '../../services/compositionEngine';
import { getAssets } from '../../utils/db';
import type { ChatMessage, VideoProject, Asset } from '../../types/video';

interface AIChatProps {
  width: number;
  project: VideoProject;
  onUpdateProject: (updates: Partial<VideoProject>) => void;
}

const MediaIcon = ({ type }: { type: string }) => {
  if (type === 'audio') return <Music size={14} />;
  if (type === 'video') return <Film size={14} />;
  return <ImageIcon size={14} />;
};

export default function AIChat({ width, project, onUpdateProject }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentThinking, setCurrentThinking] = useState('');
  const [streamingMessage, setStreamingMessage] = useState('');
  const [showThinking, setShowThinking] = useState(true);
  const [sessionTokens, setSessionTokens] = useState(0);
  const [lastRequestTokens, setLastRequestTokens] = useState(0);
  const [globalAssets, setGlobalAssets] = useState<Asset[]>([]);
  const currentRequestTokensRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Composition pipeline state
  const [isComposing, setIsComposing] = useState(false);
  const [compositionSteps, setCompositionSteps] = useState<CompositionStep[]>([]);

  useEffect(() => {
    const loadAssets = async () => setGlobalAssets(await getAssets());
    loadAssets();
    window.addEventListener('assets_updated', loadAssets);
    return () => window.removeEventListener('assets_updated', loadAssets);
  }, []);

  // Clear chat history when project changes to prevent hallucinations
  useEffect(() => {
    setMessages([]);
    setSessionTokens(0);
  }, [project.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingMessage, currentThinking, compositionSteps]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = { role: 'user', content: input, id: Date.now().toString() };
    const newMessages = [...messages, userMsg];
    
    // Inject current project context into the payload
    const contextualMessages = [
      { 
        role: 'system', 
        content: `YOU ARE THE MASTER DIRECTOR. Your goal is to create CINEMATIC, HIGH-DENSITY video masterpieces.
        
        CURRENT PROJECT STATE: ${JSON.stringify({
          name: project.name,
          description: project.description,
          aspectRatio: project.aspectRatio || '16:9',
          scenes: project.scenes
        })}. 
        AVAILABLE GLOBAL ASSETS: ${JSON.stringify(globalAssets.map(a => ({ id: a.id, name: a.name, type: a.type })))}.

        MANDATORY DIRECTOR RULES:
        1. NEVER BE LAZY. If asked to create a video, generate 10-15 scenes spanning 30-60 seconds.
        2. NARRATIVE FLOW: Every video needs a HOOK (bold intro), a JOURNEY (diverse visuals), a CLIMAX, and an OUTRO.
        3. DENSE DESIGN: Use advanced CSS. No simple centered text. Use glassmorphism, editorial corner layouts, and complex keyframe animations.
        4. MULTIMEDIA: Always include background music (zIndex: -1, type: audio). Alternate between HTML text overlays and full-screen media assets.
        5. TYPOGRAPHY: Header font: 'Poppins' (900 weight). Body: 'Lora' (Italic). Use 'cqw' units for responsiveness.
        6. SEARCH: Use concise, professional stock keywords for media_needs.` 
      },
      ...newMessages
    ];

    setMessages(newMessages);
    setInput('');
    setIsTyping(true);
    setLastRequestTokens(0); 
    currentRequestTokensRef.current = 0;
    setStreamingMessage('');

    try {
      const result = await processAgentCommand(contextualMessages, (partial) => {
        // Capture usage if available
        if (partial.usage) {
          const newTotal = partial.usage.total || 0;
          setLastRequestTokens(newTotal);
          currentRequestTokensRef.current = newTotal;
        }

        const rawData = partial.project || partial.project_script || partial;
        
        // Capture message streaming
        if (partial.message || partial.content) {
          setStreamingMessage(partial.message || partial.content);
        }

        // Capture thinking if available
        if (partial.thinking) {
          setCurrentThinking(partial.thinking);
        }

        // Handle standard script format (non-composition)
        if (rawData.type !== 'composition' && (rawData.scenes || rawData.type === 'script')) {
          const cleanScenes = (rawData.scenes || []).map((s: any, i: number) => ({
            id: s.id || `s${s.scene_number || i + 1}`,
            text: s.text || s.audio_script || s.title || "New Scene",
            duration: typeof s.duration === 'string' ? parseInt(s.duration) : (s.duration || 5),
            startTime: s.startTime || 0,
            html: s.html,
            background: s.background
          }));

          let currentStart = 0;
          cleanScenes.forEach((s: any) => {
            s.startTime = currentStart;
            currentStart += s.duration;
          });

          onUpdateProject({
            name: rawData.name || rawData.project_name || project.name,
            description: rawData.description || project.description,
            scenes: cleanScenes
          });
        }
      });
      
      const finalData = result.project || result.project_script || result;

      // --- Handle COMPOSITION type ---
      if (finalData.type === 'composition' && finalData.media_needs) {
        setIsTyping(false);
        setIsComposing(true);
        setCompositionSteps([]);

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `🎬 Starting composition: "${finalData.name}"\nSearching and downloading ${finalData.media_needs.length} media assets...`,
          id: (Date.now() + 1).toString(),
          thinking: currentThinking
        }]);

        try {
          const projectUpdate = await executeComposition(
            finalData as CompositionPlan,
            (step) => {
              setCompositionSteps(prev => {
                // Replace the latest step of the same mediaIndex/phase or append
                const existing = prev.findIndex(
                  s => 'mediaIndex' in s && 'mediaIndex' in step && s.mediaIndex === step.mediaIndex && s.phase === step.phase
                );
                if (existing >= 0 && step.phase === 'downloading') {
                  const updated = [...prev];
                  updated[existing] = step;
                  return updated;
                }
                return [...prev, step];
              });
            }
          );

          onUpdateProject(projectUpdate);

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `✅ Composition complete! "${finalData.name}" has been assembled with ${projectUpdate.scenes?.length || 0} scenes. Check the timeline and preview.`,
            id: (Date.now() + 2).toString()
          }]);
        } catch (compErr: any) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `⚠️ Composition partially failed: ${compErr.message}`,
            id: (Date.now() + 2).toString()
          }]);
        } finally {
          setIsComposing(false);
        }

      } else if (finalData.scenes || finalData.type === 'script') {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `I've updated the project layout and scenes based on your request. You can see the changes in the timeline and preview.`, 
          id: (Date.now() + 1).toString(),
          thinking: currentThinking 
        }]);
      } else {
        const chatText = finalData.message || finalData.content || "How else can I help you?";
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: chatText, 
          id: (Date.now() + 1).toString(),
          thinking: currentThinking
        }]);
      }
      setCurrentThinking('');
    } catch (error: any) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.message || "I'm having trouble connecting right now. Please try again."}`, 
        id: (Date.now() + 1).toString() 
      }]);
    } finally {
      setIsTyping(false);
      setStreamingMessage('');
      setSessionTokens(prev => prev + currentRequestTokensRef.current);
    }
  };

  // --- Render Composition Progress ---
  const renderCompositionProgress = () => {
    if (!isComposing && compositionSteps.length === 0) return null;

    // Group steps by mediaIndex
    const mediaSteps = new Map<number, CompositionStep[]>();
    const otherSteps: CompositionStep[] = [];

    for (const step of compositionSteps) {
      if ('mediaIndex' in step) {
        const existing = mediaSteps.get(step.mediaIndex) || [];
        existing.push(step);
        mediaSteps.set(step.mediaIndex, existing);
      } else {
        otherSteps.push(step);
      }
    }

    return (
      <div style={{ 
        marginLeft: '40px', 
        padding: '16px', 
        background: 'var(--bg-primary)', 
        border: '1px solid var(--border-strong)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ 
          fontSize: '11px', 
          fontWeight: 800, 
          textTransform: 'uppercase', 
          letterSpacing: '0.1em', 
          color: 'var(--brand-accent)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {isComposing && <Loader2 size={14} className="animate-spin" />}
          Composition Pipeline
        </div>

        {Array.from(mediaSteps.entries()).map(([idx, steps]) => {
          const latest = steps[steps.length - 1];
          const isSearching = latest.phase === 'searching';
          const isDownloading = latest.phase === 'downloading';
          const isDone = latest.phase === 'downloaded';
          const isFailed = latest.phase === 'search_failed';

          return (
            <div key={idx} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '4px',
              padding: '10px',
              background: 'var(--bg-secondary)',
              border: `1px solid ${isDone ? 'var(--brand-accent)' : isFailed ? '#ef4444' : 'var(--border-strong)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {'mediaType' in latest && <MediaIcon type={latest.mediaType} />}
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 700, 
                  flex: 1,
                  color: isDone ? 'var(--brand-accent)' : isFailed ? '#ef4444' : 'var(--text-primary)'
                }}>
                  {'query' in latest ? latest.query : ''}
                </span>
                {isSearching && <Search size={12} className="animate-spin" color="var(--brand-accent)" />}
                {isDownloading && <Download size={12} color="var(--brand-accent)" />}
                {isDone && <CheckCircle size={14} color="var(--brand-accent)" />}
                {isFailed && <XCircle size={14} color="#ef4444" />}
              </div>

              {isSearching && (
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                  Searching stock media...
                </div>
              )}

              {isDownloading && 'progress' in latest && (
                <div style={{ marginTop: '4px' }}>
                  <div style={{ 
                    height: '3px', 
                    background: 'var(--bg-primary)', 
                    overflow: 'hidden' 
                  }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${latest.progress}%`, 
                      background: 'var(--brand-accent)', 
                      transition: 'width 0.15s' 
                    }} />
                  </div>
                  <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
                    Downloading... {latest.progress}%
                  </span>
                </div>
              )}

              {isFailed && 'error' in latest && (
                <div style={{ fontSize: '10px', color: '#ef4444' }}>
                  {latest.error}
                </div>
              )}
            </div>
          );
        })}

        {otherSteps.map((step, i) => (
          <div key={`other-${i}`} style={{ 
            fontSize: '11px', 
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {step.phase === 'building' && <Loader2 size={12} className="animate-spin" />}
            {step.phase === 'complete' && <CheckCircle size={12} color="var(--brand-accent)" />}
            {'message' in step ? step.message : 'Finalizing...'}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ 
      width: `${width}px`, 
      borderLeft: '1px solid var(--border-strong)', 
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-secondary)',
      height: '100%'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '16px 24px', 
        borderBottom: '2px solid var(--border-strong)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        background: 'var(--bg-primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--brand-accent)', padding: '8px', borderRadius: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Terminal size={16} color="var(--bg-primary)" />
          </div>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI Agent</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '6px', height: '6px', background: isComposing ? '#f59e0b' : 'var(--brand-accent)' }}></div>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                {isComposing ? 'Composing...' : 'Connected'}
              </span>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: '0', border: '1px solid var(--border-strong)' }}>
          <Cpu size={12} color="var(--brand-accent)" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-accent)', fontFamily: 'monospace' }}>
            {(sessionTokens + (isTyping ? lastRequestTokens : 0)).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {messages.length === 0 && (
          <div className="flex-center" style={{ height: '100%', flexDirection: 'column', gap: '16px', padding: '0 24px', textAlign: 'center' }}>
            <div style={{ padding: '24px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', borderRadius: '0', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Terminal size={32} color="var(--brand-accent)" />
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>How can I help?</h4>
            <p className="content-serif" style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              "Create a video about ocean waves with music"<br/>
              "Add a cinematic intro about space exploration"<br/>
              "Compose a product showcase with images and clips"
            </p>
          </div>
        )}

        {messages.map(m => (
          <div key={m.id} style={{ 
            display: 'flex', 
            gap: '12px', 
            flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
            alignItems: 'flex-start'
          }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '0', 
              background: m.role === 'user' ? 'var(--brand-accent)' : 'var(--bg-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: m.role === 'user' ? 'none' : '1px solid var(--border-strong)'
            }}>
              {m.role === 'user' ? <User size={16} color="var(--bg-primary)" /> : <Bot size={16} color="var(--brand-accent)" />}
            </div>
            <div style={{ 
              padding: '16px', 
              borderRadius: '0', 
              background: m.role === 'user' ? 'var(--brand-accent)' : 'var(--bg-primary)',
              fontSize: '13px',
              maxWidth: '85%',
              lineHeight: 1.6,
              color: m.role === 'user' ? 'var(--bg-primary)' : 'var(--text-primary)',
              border: m.role === 'user' ? 'none' : '1px solid var(--border-strong)',
              position: 'relative',
              boxShadow: m.role === 'user' ? '4px 4px 0 rgba(217,119,87,0.3)' : 'none',
              fontWeight: m.role === 'user' ? 600 : 400,
              whiteSpace: 'pre-wrap'
            }}>
              {m.thinking && (
                <div style={{ marginBottom: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                  <button 
                    onClick={() => setShowThinking(!showThinking)}
                    style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}
                  >
                    {showThinking ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Thinking Process
                  </button>
                  {showThinking && (
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic', whiteSpace: 'pre-wrap', fontFamily: 'Lora, serif' }}>
                      {m.thinking}
                    </div>
                  )}
                </div>
              )}
              {m.content}
            </div>
          </div>
        ))}

        {/* Composition Progress Panel */}
        {(isComposing || compositionSteps.length > 0) && renderCompositionProgress()}

        {isTyping && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {currentThinking && (
              <div className="panel animate-fade-in" style={{ 
                marginLeft: '40px', 
                padding: '12px', 
                background: 'var(--bg-accent)', 
                borderStyle: 'dashed',
                fontSize: '12px',
                color: 'var(--text-tertiary)',
                fontStyle: 'italic'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  <Loader2 size={12} className="animate-spin" /> Analyzing request...
                </div>
                <div style={{ fontFamily: 'Lora, serif' }}>{currentThinking}</div>
              </div>
            )}
            
            {streamingMessage && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }} className="animate-fade-in">
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '0', 
                  background: 'var(--bg-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid var(--border-strong)'
                }}>
                  <Bot size={16} color="var(--brand-accent)" />
                </div>
                <div style={{ 
                  padding: '16px', 
                  borderRadius: '0', 
                  background: 'var(--bg-primary)',
                  fontSize: '13px',
                  maxWidth: '85%',
                  lineHeight: 1.6,
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-strong)',
                }}>
                  {streamingMessage}
                </div>
              </div>
            )}

            {!currentThinking && !streamingMessage && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-subtle)' }}>
                  <Bot size={14} color="var(--text-secondary)" />
                </div>
                <Loader2 size={16} className="animate-spin" color="var(--text-tertiary)" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '24px', borderTop: '2px solid var(--border-strong)', background: 'var(--bg-primary)' }}>
        <div style={{ position: 'relative', display: 'flex', gap: '12px' }}>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Describe your vision..."
            disabled={isComposing}
            style={{ 
              flex: 1,
              padding: '16px', 
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--border-strong)', 
              borderRadius: '0',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
              opacity: isComposing ? 0.5 : 1
            }}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping || isComposing}
            style={{ 
              background: 'var(--brand-accent)', 
              color: 'var(--bg-primary)', 
              padding: '0 20px', 
              borderRadius: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--brand-accent)',
              opacity: !input.trim() || isTyping || isComposing ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
          >
            {isTyping || isComposing ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} strokeWidth={3} />}
          </button>
        </div>
        <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '10px' }}>
          AI Agent can compose full videos with images, clips, and music. Try "Create a video about..."
        </p>
      </div>
    </div>
  );
}
