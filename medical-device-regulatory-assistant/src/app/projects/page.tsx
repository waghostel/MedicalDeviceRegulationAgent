/**
 * Projects Hub Page - Main project management interface
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AppLayout } from '@/components/layout';
import { ProjectForm } from '@/components/projects/project-form';
import { ProjectList } from '@/components/projects/project-list';
import { useProjects } from '@/hooks/use-projects';
import {
  Project,
  ProjectCreateRequest,
  ProjectUpdateRequest,
} from '@/types/project';

export default function ProjectsPage() {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const { createProject, updateProject } = useProjects();

  const handleCreateProject = () => {
    setShowCreateForm(true);
  };

  const handleSelectProject = (project: Project) => {
    router.push(`/projects/${project.id}`);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
  };

  const handleSubmitCreate = async (
    data: ProjectCreateRequest
  ): Promise<Project | null> => {
    const result = await createProject(data);
    if (result) {
      setShowCreateForm(false);
    }
    return result;
  };

  const handleSubmitEdit = async (
    data: ProjectUpdateRequest
  ): Promise<Project | null> => {
    if (!editingProject) return null;

    const result = await updateProject(editingProject.id, data);
    if (result) {
      setEditingProject(null);
    }
    return result;
  };

  return (
    <AppLayout>
      <ProjectList
        onCreateProject={handleCreateProject}
        onSelectProject={handleSelectProject}
        onEditProject={handleEditProject}
      />

      {/* Create Project Form */}
      <ProjectForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        onSubmit={handleSubmitCreate}
      />

      {/* Edit Project Form */}
      <ProjectForm
        project={editingProject || undefined}
        open={!!editingProject}
        onOpenChange={(open) => !open && setEditingProject(null)}
        onSubmit={handleSubmitEdit}
      />
    </AppLayout>
  );
}
