import React from 'react';
import { render, screen } from '@testing-library/react';
import { Breadcrumb, BreadcrumbItem } from '../Breadcrumb';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

describe('Breadcrumb', () => {
  const mockItems: BreadcrumbItem[] = [
    { label: 'Projects', href: '/projects' },
    { label: 'Device A', href: '/projects/device-a' },
    { label: 'Analysis', current: true },
  ];

  it('renders breadcrumb items correctly', () => {
    render(<Breadcrumb items={mockItems} />);

    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Device A')).toBeInTheDocument();
    expect(screen.getByText('Analysis')).toBeInTheDocument();
  });

  it('renders home icon as first item', () => {
    render(<Breadcrumb items={mockItems} />);

    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('renders links for non-current items', () => {
    render(<Breadcrumb items={mockItems} />);

    const projectsLink = screen.getByRole('link', { name: 'Projects' });
    expect(projectsLink).toHaveAttribute('href', '/projects');

    const deviceLink = screen.getByRole('link', { name: 'Device A' });
    expect(deviceLink).toHaveAttribute('href', '/projects/device-a');
  });

  it('renders current item without link', () => {
    render(<Breadcrumb items={mockItems} />);

    const currentItem = screen.getByText('Analysis');
    expect(currentItem).not.toHaveAttribute('href');
    expect(currentItem).toHaveAttribute('aria-current', 'page');
  });

  it('renders with custom className', () => {
    const { container } = render(
      <Breadcrumb items={mockItems} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles empty items array', () => {
    render(<Breadcrumb items={[]} />);

    // Should still render home icon
    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink).toBeInTheDocument();
  });
});
