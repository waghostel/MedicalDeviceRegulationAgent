'use client';

import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showQuickActions?: boolean;
  className?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  showSidebar = true,
  showQuickActions = false,
  className,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuToggle={toggleSidebar} showMenuButton={showSidebar} />

      <div className="flex">
        {showSidebar && (
          <>
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:pt-14">
              <div className="flex-1 flex flex-col min-h-0 border-r bg-background">
                <Sidebar />
              </div>
            </aside>

            {/* Mobile Sidebar */}
            {sidebarOpen && (
              <div className="fixed inset-0 z-40 md:hidden">
                <div
                  className="fixed inset-0 bg-background/80 backdrop-blur-sm"
                  onClick={toggleSidebar}
                />
                <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-background border-r">
                  <div className="flex h-full flex-col pt-14">
                    <Sidebar />
                  </div>
                </aside>
              </div>
            )}
          </>
        )}

        {/* Main Content */}
        <main
          className={cn(
            'flex-1 min-h-screen',
            showSidebar && 'md:ml-64',
            className
          )}
        >
          <div className="container mx-auto p-6">{children}</div>
        </main>

        {/* Quick Actions Panel (if enabled) */}
        {showQuickActions && (
          <aside className="hidden lg:flex lg:w-80 lg:flex-col lg:fixed lg:inset-y-0 lg:right-0 lg:pt-14">
            <div className="flex-1 flex flex-col min-h-0 border-l bg-background">
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                {/* Quick actions content will be added in later tasks */}
                <div className="space-y-2">
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Quick actions will be implemented in Phase 2
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
