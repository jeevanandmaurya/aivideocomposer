import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Video, Sparkles, ArrowRight, Moon, Sun } from 'lucide-react';
import type { VideoProject } from '../types/video';
import { EXAMPLES } from './Editor';
import { useTheme } from '../contexts/ThemeContext';

export default function Dashboard() {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const examplesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    const saved = localStorage.getItem('user_projects');
    if (saved) setProjects(JSON.parse(saved));
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const createNewProject = () => {
    const newProject: VideoProject = {
      id: `proj-${Date.now()}`,
      name: 'New Composition',
      description: 'Waiting for your creative direction...',
      createdAt: Date.now(),
      scenes: []
    };
    const updated = [newProject, ...projects];
    setProjects(updated);
    localStorage.setItem('user_projects', JSON.stringify(updated));
    navigate(`/editor/${newProject.id}`);
  };

  const scrollToExamples = () => {
    examplesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="main-content" style={{ overflowY: 'auto', background: 'var(--bg-primary)' }}>
      {/* Brutalist Editorial Hero */}
      <section style={{ 
        minHeight: '85vh', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'flex-end',
        padding: isMobile ? '80px 20px 40px' : '120px 8% 80px',
        position: 'relative',
        overflow: 'hidden',
        borderBottom: '1px solid var(--border-strong)',
        background: `radial-gradient(circle at 100% 0%, rgba(217, 119, 87, 0.08) 0%, transparent 50%),
                     radial-gradient(circle at 0% 100%, rgba(106, 155, 204, 0.05) 0%, transparent 50%)`
      }}>
        {/* Architectural Grid Background */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.5, zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '40px', alignItems: 'end' }}>
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--brand-accent)', fontSize: '12px', fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '32px' }}>
              <div style={{ width: '40px', height: '2px', background: 'currentColor' }} />
              Next-Gen Creative Studio
            </div>
            
            <h1 style={{ 
              fontSize: 'clamp(56px, 10vw, 160px)', 
              fontWeight: 800, 
              lineHeight: 0.85, 
              letterSpacing: '-0.05em',
              fontFamily: 'Poppins, sans-serif',
              textTransform: 'uppercase',
              color: 'var(--text-primary)'
            }}>
              AI Video<br />
              <span style={{ color: 'var(--brand-accent)' }}>Composer.</span>
            </h1>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }} style={{ paddingBottom: isMobile ? '0' : '20px' }}>
            <p className="content-serif" style={{ 
              fontSize: 'clamp(16px, 2vw, 24px)', 
              color: 'var(--text-secondary)', 
              lineHeight: 1.6, 
              marginBottom: '40px',
              fontStyle: 'italic',
              borderLeft: '2px solid var(--brand-accent)',
              paddingLeft: '24px'
            }}>
              The intelligent orchestration layer for modern video production. Turn narrative intent into high-fidelity cinematic experiences instantly.
            </p>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <button onClick={createNewProject} style={{ padding: '18px 40px', fontSize: '14px', fontWeight: 800, background: 'var(--text-primary)', color: 'var(--bg-primary)', display: 'flex', alignItems: 'center', gap: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }} className="hover-scale">
                Start Composing <ArrowRight size={16} strokeWidth={3} />
              </button>
              <button onClick={scrollToExamples} style={{ padding: '18px 40px', fontSize: '14px', fontWeight: 800, border: '1px solid var(--border-strong)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }} className="hover-scale">
                View Examples
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Projects Section */}
      <section style={{ padding: isMobile ? '60px 20px' : '120px 8%', minHeight: '100vh', position: 'relative' }}>
        
        {/* Section Header */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: '24px', marginBottom: '64px', paddingBottom: '24px', borderBottom: '2px solid var(--text-primary)' }}>
          <div>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 64px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1 }}>Studio<br/>Library</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <p className="content-serif" style={{ fontSize: '16px', color: 'var(--text-secondary)', fontStyle: 'italic', maxWidth: '240px', textAlign: isMobile ? 'left' : 'right' }}>
              Your creative archive and recent drafts.
            </p>
            <button onClick={createNewProject} style={{ width: '56px', height: '56px', background: 'var(--brand-accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="hover-scale">
              <Plus size={24} strokeWidth={3} />
            </button>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="animate-fade-in" style={{ padding: '100px 40px', textAlign: 'center', border: '1px dashed var(--border-strong)' }}>
            <div style={{ width: '64px', height: '64px', border: '1px solid var(--brand-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Sparkles size={28} color="var(--brand-accent)" />
            </div>
            <h3 style={{ marginBottom: '12px', fontSize: '24px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Archive is empty</h3>
            <p className="content-serif" style={{ marginBottom: '40px', fontSize: '16px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Let's bring your first idea to the screen.</p>
            <button onClick={createNewProject} style={{ padding: '16px 40px', fontSize: '14px', fontWeight: 800, background: 'var(--text-primary)', color: 'var(--bg-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }} className="hover-scale">
              Create Project
            </button>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(360px, 1fr))', 
            gap: isMobile ? '16px' : '40px' 
          }}>
            {projects.map((project, index) => (
              <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                <ProjectCard project={project} isMobile={isMobile} onClick={() => navigate(`/editor/${project.id}`)} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Examples Section */}
        <div ref={examplesRef} style={{ marginTop: isMobile ? '80px' : '160px', scrollMarginTop: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '64px' }}>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--text-secondary)' }}>Inspiration<br/>Gallery</h2>
            <div style={{ height: '2px', flex: 1, background: 'var(--text-secondary)' }} />
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(360px, 1fr))', 
            gap: isMobile ? '16px' : '40px' 
          }}>
            {EXAMPLES.map((project, index) => (
              <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + index * 0.1 }}>
                <ProjectCard project={project} isMobile={isMobile} onClick={() => navigate(`/editor/${project.id}`)} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Brutalist Footer */}
      <footer style={{ 
        padding: isMobile ? '60px 20px' : '120px 8%', 
        borderTop: '2px solid var(--text-primary)', 
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        gap: '64px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Massive Background Text */}
        <div style={{ position: 'absolute', bottom: isMobile ? '20%' : '-10%', left: '5%', fontSize: '25vw', fontWeight: 900, color: 'var(--bg-secondary)', zIndex: 0, lineHeight: 0.8, pointerEvents: 'none', userSelect: 'none' }}>
          COMPOSER
        </div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: '48px' }}>
          <div style={{ maxWidth: '400px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--brand-accent)', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Video size={16} color="white" strokeWidth={3} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI Video Composer</h3>
            </div>
            <p className="content-serif" style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>
              Orchestrating high-fidelity cinematic experiences through intelligent narrative intent.
            </p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: isMobile ? 'flex-start' : 'flex-end' }}>
            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
              {['Twitter', 'GitHub', 'LinkedIn'].map(social => (
                <button key={social} style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }} className="hover-scale">{social}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
              {['Features', 'Documentation', 'API'].map(link => (
                <button key={link} style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="hover-scale">{link}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ 
          position: 'relative',
          zIndex: 1,
          paddingTop: '32px', 
          borderTop: '1px solid var(--border-strong)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px',
          fontSize: '12px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--text-tertiary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '8px', height: '8px', background: 'var(--tertiary-accent)' }} />
            System: Operational
          </div>
          <div>© 2026 Built with Intelligence.</div>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <button 
              onClick={toggleTheme} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '8px 16px',
                border: '1px solid var(--border-strong)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontWeight: 800,
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--text-primary)';
                e.currentTarget.style.color = 'var(--bg-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-primary)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
            >
              {theme === 'dark' ? <Sun size={14} strokeWidth={3} /> : <Moon size={14} strokeWidth={3} />} 
              {theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE'}
            </button>
            <button className="hover-scale">Privacy</button>
            <button className="hover-scale">Terms</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProjectCard({ project, isMobile, onClick }: { project: VideoProject, isMobile: boolean, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      style={{ 
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: 'transparent',
        border: '1px solid var(--border-strong)',
        transition: 'all var(--transition-normal)'
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--brand-accent)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Brutalist Meta Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: isMobile ? '8px 12px' : '12px 16px', borderBottom: '1px solid var(--border-strong)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, color: 'var(--text-tertiary)', background: 'var(--bg-secondary)' }}>
        <span>ID: {project.id.slice(-6)}</span>
        <span>{new Date(project.createdAt).toLocaleDateString()}</span>
      </div>

      {/* Image Container */}
      <div style={{ 
        aspectRatio: '16/9', 
        background: `var(--bg-primary)`, 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(45deg, var(--border-subtle) 25%, transparent 25%, transparent 75%, var(--border-subtle) 75%, var(--border-subtle)), linear-gradient(45deg, var(--border-subtle) 25%, transparent 25%, transparent 75%, var(--border-subtle) 75%, var(--border-subtle))', backgroundSize: '20px 20px', backgroundPosition: '0 0, 10px 10px', opacity: 0.1 }} />
        
        <Video size={isMobile ? 32 : 48} color="var(--brand-accent)" strokeWidth={1} style={{ opacity: 0.5, zIndex: 1 }} />
        
        {project.scenes?.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '0',
            right: '0',
            padding: isMobile ? '6px 12px' : '8px 16px',
            background: 'var(--brand-accent)',
            color: 'var(--bg-primary)',
            fontSize: isMobile ? '9px' : '10px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{ width: '4px', height: '4px', background: 'var(--bg-primary)' }} />
            {project.scenes.length} SEQ
          </div>
        )}

        <div style={{
          position: 'absolute',
          top: '0',
          right: '0',
          padding: isMobile ? '6px 12px' : '8px 16px',
          background: 'var(--bg-secondary)',
          borderLeft: '2px solid var(--border-strong)',
          borderBottom: '2px solid var(--border-strong)',
          color: 'var(--text-secondary)',
          fontSize: isMobile ? '9px' : '10px',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          display: 'flex',
          alignItems: 'center'
        }}>
          {project.aspectRatio || '16:9'}
        </div>
      </div>
      
      {/* Content */}
      <div style={{ padding: isMobile ? '16px 12px' : '24px 16px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-strong)', background: 'var(--bg-secondary)', flex: 1 }}>
        <h3 style={{ fontSize: isMobile ? '14px' : '20px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{project.name}</h3>
          <p className="content-serif" style={{ 
            fontSize: '14px', 
            color: 'var(--text-secondary)', 
            lineHeight: 1.5,
            fontStyle: 'italic',
            display: '-webkit-box', 
            WebkitLineClamp: 2, 
            WebkitBoxOrient: 'vertical', 
            overflow: 'hidden' 
          }}>
            {project.description || 'Waiting for creative direction...'}
          </p>
      </div>
    </div>
  );
}



