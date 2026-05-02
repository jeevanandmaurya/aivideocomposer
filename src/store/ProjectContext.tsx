import React, { createContext, useContext, useState, type ReactNode } from 'react';

export interface Scene {
  id: number;
  duration: number;
  visualDescription: string;
  audioScript: string;
  keywords: string[];
  assetUrl?: string;
}

export interface ProjectData {
  title: string;
  mood: string;
  scenes: Scene[];
}

interface ProjectContextType {
  project: ProjectData | null;
  setProject: (project: ProjectData) => void;
  currentSceneIndex: number;
  setCurrentSceneIndex: (index: number) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <ProjectContext.Provider value={{ 
      project, 
      setProject, 
      currentSceneIndex, 
      setCurrentSceneIndex,
      isLoading, 
      setIsLoading 
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
