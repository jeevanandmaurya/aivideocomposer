import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Video, Clock, ChevronRight } from 'lucide-react';
import { Button } from '../../components/Button';
import { GlassCard } from '../../components/GlassCard';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const projects = [
    { id: '1', title: 'Climate Change Explainer', date: '2 hours ago', status: 'Draft' },
    { id: '2', title: 'Space Exploration', date: 'Yesterday', status: 'Completed' },
    { id: '3', title: 'Coffee Brewing Guide', date: '3 days ago', status: 'Draft' },
  ];

  return (
    <div className="dashboard-page animate-fade-in" style={{ padding: '40px 80px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '60px' }}>
        <div>
          <h1 className="text-neon" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Video Composer</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back, Creator.</p>
        </div>
        <Button variant="neon" size="lg" onClick={() => navigate('/editor/new')}>
          <Plus size={20} style={{ marginRight: '8px' }} />
          New Project
        </Button>
      </header>

      <section>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Recent Projects</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {projects.map((project) => (
            <GlassCard 
              key={project.id} 
              interactive 
              className="project-card"
              style={{ padding: '24px' }}
              onClick={() => navigate(`/editor/${project.id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div className="glass" style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                  <Video size={24} color="var(--accent-primary)" />
                </div>
                <div style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                  {project.status}
                </div>
              </div>
              <h3 style={{ marginBottom: '12px' }}>{project.title}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                <Clock size={14} />
                <span>{project.date}</span>
              </div>
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <ChevronRight size={20} color="var(--text-secondary)" />
              </div>
            </GlassCard>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
