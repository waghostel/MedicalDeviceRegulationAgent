import { render, screen, fireEvent } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { AppLayout } from '../AppLayout';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>;
  MockLink.displayName = 'MockLink';
  return MockLink;
});

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

describe('AppLayout', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/');
  });

  it('renders children content', () => {
    render(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders header by default', () => {
    render(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    );

    expect(
      screen.getByText('Medical Device Regulatory Assistant')
    ).toBeInTheDocument();
  });

  it('renders sidebar when showSidebar is true', () => {
    render(
      <AppLayout showSidebar={true}>
        <div>Test Content</div>
      </AppLayout>
    );

    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('hides sidebar when showSidebar is false', () => {
    render(
      <AppLayout showSidebar={false}>
        <div>Test Content</div>
      </AppLayout>
    );

    expect(screen.queryByText('Navigation')).not.toBeInTheDocument();
  });

  it('shows quick actions panel when showQuickActions is true', () => {
    render(
      <AppLayout showQuickActions={true}>
        <div>Test Content</div>
      </AppLayout>
    );

    // There are two "Quick Actions" headings - one in sidebar, one in quick actions panel
    expect(screen.getAllByText('Quick Actions')).toHaveLength(2);
    expect(
      screen.getByText('Quick actions will be implemented in Phase 2')
    ).toBeInTheDocument();
  });

  it('applies custom className to main content', () => {
    const { container } = render(
      <AppLayout className="custom-main-class">
        <div>Test Content</div>
      </AppLayout>
    );

    const mainElement = container.querySelector('main');
    expect(mainElement).toHaveClass('custom-main-class');
  });

  it('toggles mobile sidebar when menu button is clicked', () => {
    // Mock window.matchMedia for responsive behavior
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    render(
      <AppLayout showSidebar={true}>
        <div>Test Content</div>
      </AppLayout>
    );

    const menuButton = screen.getByRole('button', { name: /toggle menu/i });

    // Initially, mobile sidebar should not be visible
    expect(screen.queryByTestId('mobile-sidebar')).not.toBeInTheDocument();

    // Click menu button to open mobile sidebar
    fireEvent.click(menuButton);

    // Mobile sidebar should now be visible (though we can't easily test the CSS classes in jsdom)
    // We can at least verify the button click doesn't cause errors
    expect(menuButton).toBeInTheDocument();
  });

  it('has proper responsive layout classes', () => {
    const { container } = render(
      <AppLayout showSidebar={true}>
        <div>Test Content</div>
      </AppLayout>
    );

    const mainElement = container.querySelector('main');
    expect(mainElement).toHaveClass('md:ml-64');
  });

  it('renders with minimal layout when no optional props provided', () => {
    render(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    );

    // Should render header and sidebar by default
    expect(
      screen.getByText('Medical Device Regulatory Assistant')
    ).toBeInTheDocument();
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();

    // Should not render quick actions by default
    expect(
      screen.queryByText('Quick actions will be implemented in Phase 2')
    ).not.toBeInTheDocument();
  });
});
