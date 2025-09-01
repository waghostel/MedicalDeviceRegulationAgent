'use client';

import { AgentWorkflowPage } from '@/components/agent/AgentWorkflowPage';
import { ProjectContextProvider } from '@/components/providers/ProjectContextProvider';
import { ProjectContext } from '@/types/copilot';

// Mock project data for demonstration
const mockProject: ProjectContext = {
  id: 'project-1',
  name: 'Cardiac Monitoring Device',
  description: 'A wearable cardiac monitoring device for continuous heart rhythm analysis',
  deviceType: 'Class II Medical Device',
  intendedUse: 'For continuous monitoring of cardiac rhythm in ambulatory patients to detect arrhythmias',
  status: 'in-progress'
};

export default function AgentPage() {
  return (
    <ProjectContextProvider>
      <AgentWorkflowPage 
        projectId="project-1"
        initialProject={mockProject}
      />
    </ProjectContextProvider>
  );
}