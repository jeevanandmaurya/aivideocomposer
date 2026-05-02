import React from 'react';
import { Play, SkipBack, SkipForward, Maximize2 } from 'lucide-react';
import { Button } from '../../../components/Button';
import { useProject } from '../../../store/ProjectContext';

const Canvas: React.FC = () => {
  const { project, currentSceneIndex, setCurrentSceneIndex } = useProject();
  const currentScene = project?.scenes[currentSceneIndex];

  const handlePrev = () => {
    if (currentSceneIndex > 0) {
      setCurrentSceneIndex(currentSceneIndex - 1);
    }
  };

  const handleNext = () => {
    if (project && currentSceneIndex < project.scenes.length - 1) {
      setCurrentSceneIndex(currentSceneIndex + 1);
    }
  };

  return (
    <section className="canvas-container">
      <div style={{ width: '100%', maxWidth: '900px' }}>
        <div className="canvas-preview">
          <div style={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'linear-gradient(to bottom right, #0a0a0a, #1a1a1a)',
            padding: '40px',
            textAlign: 'center'
          }}>
            {currentScene ? (
              <>
                <h2 style={{ color: 'var(--accent-primary)', marginBottom: '20px', fontSize: '1.5rem' }}>
                  {currentScene.visualDescription}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  "{currentScene.audioScript}"
                </p>
                <div style={{ marginTop: '20px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  Scene {currentSceneIndex + 1} of {project.scenes.length}
                </div>
              </>
            ) : (
              <h2 style={{ color: '#333', fontSize: '1rem', textTransform: 'uppercase' }}>
                Ask AI to generate a script to start
              </h2>
            )}
          </div>
        </div>

        <div className="canvas-controls" style={{ 
          marginTop: '20px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '24px'
        }}>
          <Button variant="ghost" size="sm" onClick={handlePrev} disabled={currentSceneIndex === 0}>
            <SkipBack size={18} />
          </Button>
          <Button variant="primary" style={{ borderRadius: '50%', width: '48px', height: '48px', padding: 0 }}>
            <Play size={24} fill="black" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleNext} disabled={!project || currentSceneIndex === project.scenes.length - 1}>
            <SkipForward size={18} />
          </Button>
          
          <div style={{ position: 'absolute', right: '40px' }}>
            <Button variant="ghost" size="sm">
              <Maximize2 size={18} />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Canvas;
