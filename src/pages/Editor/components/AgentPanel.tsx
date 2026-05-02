import React, { useState } from 'react';
import { Send, Sparkles, User, Bot, Loader2 } from 'lucide-react';
import { Button } from '../../../components/Button';
import { useProject } from '../../../store/ProjectContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const AgentPanel: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: "Hello! I'm your AI Video Assistant. Tell me what kind of video you'd like to create today." }
  ]);
  const { setProject, isLoading, setIsLoading } = useProject();

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input })
      });

      if (!response.ok) throw new Error('Failed to generate script');

      const data = await response.json();
      setProject(data);

      const assistantMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: `I've generated a script for "${data.title}" with ${data.scenes.length} scenes. You can see the breakdown in the timeline.` 
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      const errorMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: "Sorry, I encountered an error while generating the script. Please check your API key and try again." 
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside className="editor-sidebar" style={{ borderLeft: '1px solid var(--glass-border)' }}>
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '0.875rem' }}>AI Assistant</h3>
        </div>
      </div>

      <div className="sidebar-content" style={{ display: 'flex', flexDirection: 'column', padding: '16px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: '4px',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
              }}>
                {msg.role === 'assistant' ? <Bot size={14} color="var(--accent-primary)" /> : <User size={14} />}
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  {msg.role === 'assistant' ? 'AI Agent' : 'You'}
                </span>
              </div>
              <div className="glass" style={{ 
                padding: '12px', 
                borderRadius: '12px', 
                maxWidth: '90%', 
                fontSize: '0.875rem',
                lineHeight: '1.4',
                background: msg.role === 'user' ? 'rgba(139, 92, 246, 0.1)' : 'var(--glass-bg)',
                border: msg.role === 'user' ? '1px solid rgba(139, 92, 246, 0.2)' : '1px solid var(--glass-border)'
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader2 size={16} className="animate-spin" color="var(--accent-primary)" />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Thinking...</span>
            </div>
          )}
        </div>

        <div className="glass" style={{ display: 'flex', alignItems: 'center', padding: '8px 12px' }}>
          <input 
            placeholder="Ask AI to generate script..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.875rem', outline: 'none', width: '100%' }}
          />
          <Button variant="ghost" size="sm" onClick={handleSend} disabled={isLoading}>
            <Send size={18} />
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default AgentPanel;
