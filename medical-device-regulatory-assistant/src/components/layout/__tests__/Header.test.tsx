import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../Header';

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

describe('Header', () => {
  it('renders the application title', () => {
    render(<Header />);

    expect(
      screen.getByText('Medical Device Regulatory Assistant')
    ).toBeInTheDocument();
    expect(screen.getByText('MVP')).toBeInTheDocument();
  });

  it('shows menu button when showMenuButton is true', () => {
    render(<Header showMenuButton={true} />);

    const menuButton = screen.getByRole('button', { name: /toggle menu/i });
    expect(menuButton).toBeInTheDocument();
  });

  it('hides menu button when showMenuButton is false', () => {
    render(<Header showMenuButton={false} />);

    const menuButton = screen.queryByRole('button', { name: /toggle menu/i });
    expect(menuButton).not.toBeInTheDocument();
  });

  it('calls onMenuToggle when menu button is clicked', () => {
    const mockOnMenuToggle = jest.fn();
    render(<Header onMenuToggle={mockOnMenuToggle} showMenuButton={true} />);

    const menuButton = screen.getByRole('button', { name: /toggle menu/i });
    fireEvent.click(menuButton);

    expect(mockOnMenuToggle).toHaveBeenCalledTimes(1);
  });

  it('renders user and settings buttons', () => {
    render(<Header />);

    expect(
      screen.getByRole('button', { name: /user menu/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /settings/i })
    ).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<Header showMenuButton={true} />);

    // The sr-only span provides the accessible name, not aria-label
    expect(screen.getByText('Toggle Menu')).toBeInTheDocument();
  });
});
