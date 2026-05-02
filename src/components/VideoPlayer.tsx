import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Scene } from '../types/video';

interface VideoPlayerProps {
  scenes: Scene[];
  onComplete?: () => void;
}

export function VideoPlayer({ scenes, onComplete }: VideoPlayerProps) {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (scenes.length > 0) {
      setCurrentSceneIndex(0);
      setIsPlaying(true);
    }
  }, [scenes]);

  useEffect(() => {
    if (!isPlaying || scenes.length === 0) return;

    const timer = setTimeout(() => {
      if (currentSceneIndex < scenes.length - 1) {
        setCurrentSceneIndex(prev => prev + 1);
      } else {
        setIsPlaying(false);
        if (onComplete) onComplete();
      }
    }, 4000); // 4 seconds per scene

    return () => clearTimeout(timer);
  }, [currentSceneIndex, isPlaying, scenes]);

  if (scenes.length === 0) {
    return (
      <div style={{
        width: '100%',
        aspectRatio: '16/9',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--border-color)'
      }}>
        <p style={{ color: 'var(--text-muted)' }}>Your generated video will appear here</p>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      aspectRatio: '16/9',
      backgroundColor: '#050505',
      borderRadius: '16px',
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--border-color)',
      backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 60%)'
    }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSceneIndex}
          initial={{ opacity: 0, scale: 0.9, y: 30, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 1.1, y: -30, filter: 'blur(10px)' }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'absolute',
            width: '85%',
            textAlign: 'center',
            color: '#fff',
          }}
        >
          <h2 style={{ 
            fontSize: 'clamp(28px, 4vw, 72px)', 
            fontWeight: 800, 
            textShadow: '0 10px 30px rgba(0,0,0,0.8)',
            lineHeight: 1.2,
            letterSpacing: '-0.02em'
          }}>
            {scenes[currentSceneIndex]?.text}
          </h2>
        </motion.div>
      </AnimatePresence>
      
      {/* Progress Bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: '6px',
        backgroundColor: 'rgba(255,255,255,0.1)',
        width: '100%'
      }}>
        <motion.div 
          initial={{ width: '0%' }}
          animate={{ width: `${((currentSceneIndex + 1) / scenes.length) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          style={{
            height: '100%',
            background: 'var(--gradient-primary)',
            boxShadow: '0 0 10px var(--accent-glow)'
          }}
        />
      </div>
    </div>
  );
}
