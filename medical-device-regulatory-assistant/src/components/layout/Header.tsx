'use client';

import { Menu, User, Settings } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';


interface HeaderProps {
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onMenuToggle,
  showMenuButton = true,
}) => (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="sm"
            className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        )}

        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-xl">
              Medical Device Regulatory Assistant
            </span>
            <Badge variant="secondary" className="ml-2">
              MVP
            </Badge>
          </Link>
        </div>

        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <Link
            href="/"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Dashboard
          </Link>
          <Link
            href="/agent"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            AI Assistant
          </Link>
        </nav>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <User className="h-4 w-4" />
              <span className="sr-only">User menu</span>
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
