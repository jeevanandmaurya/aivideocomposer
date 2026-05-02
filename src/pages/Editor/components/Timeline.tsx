import React from 'react';
import { Layers, Volume2, Clock } from 'lucide-react';
import { useProject } from '../../../store/ProjectContext';

const Timeline: React.FC = () => {
  const { project, currentSceneIndex, setCurrentSceneIndex } = useProject();

  const totalDuration = project?.scenes.reduce((acc, scene) => acc + scene.duration, 0) || 0;

  return (
    <div className="timeline-container" style={{ flex: 1, padding: '20px', position: 'relative' }}>
      <div className="timeline-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Clock size={16} color="var(--text-secondary)" />
          <span style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
            00:00 / 0{Math.floor(totalDuration / 60)}:{String(totalDuration % 60).padStart(2, '0')}
          </span>
        </div>
      </div>

      <div className="timeline-tracks" style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
        {/* Track 1: Visuals */}
        <div className="timeline-track" style={{ display: 'flex', gap: '12px' }}>
          <div style={{ width: '100px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <Layers size={14} />
            <span style={{ fontSize: '0.75rem' }}>Visuals</span>
          </div>
          <div className="glass" style={{ flex: 1, height: '40px', position: 'relative', overflow: 'hidden', display: 'flex' }}>
            {project?.scenes.map((scene, idx) => (
              <div 
                key={scene.id} 
                onClick={() => setCurrentSceneIndex(idx)}
                style={{ 
                  width: `${(scene.duration / totalDuration) * 100}%`, 
                  height: '100%', 
                  background: idx === currentSceneIndex ? 'var(--accent-primary)' : 'var(--accent-primary)', 
                  opacity: idx === currentSceneIndex ? 0.4 : (idx % 2 === 0 ? 0.2 : 0.15),
                  borderLeft: '1px solid var(--accent-primary)',
                  borderTop: idx === currentSceneIndex ? '2px solid var(--accent-primary)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 8px',
                  fontSize: '0.65rem',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {scene.visualDescription}
              </div>
            ))}
          </div>
        </div>

        {/* Track 2: Audio */}
        <div className="timeline-track" style={{ display: 'flex', gap: '12px' }}>
          <div style={{ width: '100px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <Volume2 size={14} />
            <span style={{ fontSize: '0.75rem' }}>Audio</span>
          </div>
          <div className="glass" style={{ flex: 1, height: '40px', display: 'flex' }}>
            {project?.scenes.map((scene, idx) => (
              <div 
                key={scene.id} 
                onClick={() => setCurrentSceneIndex(idx)}
                style={{ 
                  width: `${(scene.duration / totalDuration) * 100}%`, 
                  height: '100%', 
                  background: 'var(--accent-secondary)', 
                  opacity: idx === currentSceneIndex ? 0.3 : (idx % 2 === 0 ? 0.1 : 0.08),
                  borderLeft: '1px solid var(--accent-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 8px',
                  fontSize: '0.65rem',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                {scene.audioScript}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
