import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Save, Download } from 'lucide-react';
import { Button } from '../../components/Button';
import Timeline from './components/Timeline.tsx';
import AgentPanel from './components/AgentPanel.tsx';
import Canvas from './components/Canvas.tsx';
import './Editor.css';

const Editor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState(id === 'new' ? 'Untitled Project' : 'Climate Change Explainer');

  return (
    <div className="editor-container">
      {/* Top Navigation */}
      <header className="editor-header">
        <div className="header-left">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} style={{ marginRight: '16px' }}>
            <ChevronLeft size={20} />
          </Button>
          <input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            className="title-input"
          />
        </div>
        <div className="header-actions">
          <Button variant="secondary" style={{ marginRight: '12px' }}>
            <Save size={18} style={{ marginRight: '8px' }} />
            Save
          </Button>
          <Button variant="neon">
            <Download size={18} style={{ marginRight: '8px' }} />
            Export
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="editor-workspace">
        <div className="center-workspace">
          <Canvas />
          <Timeline />
        </div>

        <AgentPanel />
      </main>
    </div>
  );
};

export default Editor;
