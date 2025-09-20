import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { Project } from '@/types/project';

import { ProjectCard } from '@/components/ProjectCard';


// Mock project data
const mockProject: Project = {
  id: '1',
  userId: 'user-1',
  name: 'Test Cardiac Monitor',
  description: 'A continuous cardiac monitoring device',
  deviceType: 'Class II Medical Device',
  intendedUse: 'Continuous monitoring of cardiac rhythm',
  status: 'in-progress',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
};

const mockOnSelect = jest.fn();
const mockOnEdit = jest.fn();
const mockOnDelete = jest.fn();

describe('ProjectCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders project information correctly', () => {
    render(
      <ProjectCard
        project={mockProject}
        onSelect={mockOnSelect}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Test Cardiac Monitor')).toBeInTheDocument();
    expect(
      screen.getByText('A continuous cardiac monitoring device')
    ).toBeInTheDocument();
    expect(screen.getByText('Class II Medical Device')).toBeInTheDocument();
    expect(screen.getByText('in-progress')).toBeInTheDocument();
  });

  it('calls onSelect when card is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ProjectCard
        project={mockProject}
        onSelect={mockOnSelect}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const card = screen.getByTestId('project-card');
    await user.click(card);

    expect(mockOnSelect).toHaveBeenCalledWith(mockProject.id);
  });

  it('calls onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ProjectCard
        project={mockProject}
        onSelect={mockOnSelect}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const editButton = screen.getByTestId('edit-project-button');
    await user.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockProject.id);
    expect(mockOnSelect).not.toHaveBeenCalled(); // Should not trigger card selection
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ProjectCard
        project={mockProject}
        onSelect={mockOnSelect}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByTestId('delete-project-button');
    await user.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith(mockProject.id);
  });

  it('displays correct status badge variant', () => {
    const completedProject = { ...mockProject, status: 'completed' as const };

    render(
      <ProjectCard
        project={completedProject}
        onSelect={mockOnSelect}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const badge = screen.getByText('completed');
    expect(badge).toHaveClass('bg-green-100'); // Assuming completed status has green styling
  });

  it('formats dates correctly', () => {
    render(
      <ProjectCard
        project={mockProject}
        onSelect={mockOnSelect}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/Created: Jan 1, 2024/)).toBeInTheDocument();
    expect(screen.getByText(/Updated: Jan 2, 2024/)).toBeInTheDocument();
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();

    render(
      <ProjectCard
        project={mockProject}
        onSelect={mockOnSelect}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const card = screen.getByTestId('project-card');

    // Focus the card
    card.focus();
    expect(card).toHaveFocus();

    // Press Enter to select
    await user.keyboard('{Enter}');
    expect(mockOnSelect).toHaveBeenCalledWith(mockProject.id);
  });

  it('is accessible with proper ARIA labels', () => {
    render(
      <ProjectCard
        project={mockProject}
        onSelect={mockOnSelect}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const card = screen.getByTestId('project-card');
    expect(card).toHaveAttribute('role', 'button');
    expect(card).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Test Cardiac Monitor')
    );

    const editButton = screen.getByTestId('edit-project-button');
    expect(editButton).toHaveAttribute('aria-label', 'Edit project');

    const deleteButton = screen.getByTestId('delete-project-button');
    expect(deleteButton).toHaveAttribute('aria-label', 'Delete project');
  });

  it('handles long text content gracefully', () => {
    const longTextProject = {
      ...mockProject,
      name: 'Very Long Project Name That Should Be Truncated Properly',
      description:
        'This is a very long description that should be handled gracefully by the component and not break the layout or cause overflow issues',
    };

    render(
      <ProjectCard
        project={longTextProject}
        onSelect={mockOnSelect}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const card = screen.getByTestId('project-card');
    expect(card).toBeInTheDocument();

    // Verify text is present (truncation would be handled by CSS)
    expect(screen.getByText(longTextProject.name)).toBeInTheDocument();
    expect(screen.getByText(longTextProject.description)).toBeInTheDocument();
  });

  it('prevents event bubbling on button clicks', async () => {
    const user = userEvent.setup();

    render(
      <ProjectCard
        project={mockProject}
        onSelect={mockOnSelect}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const editButton = screen.getByTestId('edit-project-button');
    await user.click(editButton);

    // Only edit should be called, not select (event should not bubble)
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).not.toHaveBeenCalled();
  });
});
