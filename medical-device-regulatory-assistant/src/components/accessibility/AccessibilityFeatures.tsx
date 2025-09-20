'use client';

import {
  Eye,
  EyeOff,
  Type,
  Contrast,
  MousePointer,
  Keyboard,
  Volume2,
  Settings,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  focusIndicators: boolean;
  screenReaderOptimized: boolean;
  fontSize: number;
  announceChanges: boolean;
}

const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  reducedMotion: false,
  largeText: false,
  focusIndicators: true,
  screenReaderOptimized: false,
  fontSize: 16,
  announceChanges: true,
};

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] =
    useState<AccessibilitySettings>(defaultSettings);

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('accessibility-settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load accessibility settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));
    applyAccessibilitySettings(settings);
  }, [settings]);

  const applyAccessibilitySettings = (settings: AccessibilitySettings) => {
    const root = document.documentElement;

    // High contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Large text
    if (settings.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }

    // Enhanced focus indicators
    if (settings.focusIndicators) {
      root.classList.add('enhanced-focus');
    } else {
      root.classList.remove('enhanced-focus');
    }

    // Screen reader optimizations
    if (settings.screenReaderOptimized) {
      root.classList.add('screen-reader-optimized');
    } else {
      root.classList.remove('screen-reader-optimized');
    }

    // Font size
    root.style.setProperty('--base-font-size', `${settings.fontSize}px`);
  };

  return (
    <AccessibilityContext.Provider value={{ settings, setSettings }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

const AccessibilityContext = React.createContext<{
  settings: AccessibilitySettings;
  setSettings: React.Dispatch<React.SetStateAction<AccessibilitySettings>>;
} | null>(null);

export const useAccessibility = () => {
  const context = React.useContext(AccessibilityContext);
  if (!context) {
    throw new Error(
      'useAccessibility must be used within AccessibilityProvider'
    );
  }
  return context;
};

// Accessibility settings panel
export const AccessibilityPanel: React.FC<{ className?: string }> = ({
  className,
}) => {
  const { settings, setSettings } = useAccessibility();

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Accessibility Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual Settings */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm">Visual</h3>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="high-contrast">High Contrast Mode</Label>
              <p className="text-xs text-muted-foreground">
                Increases contrast for better visibility
              </p>
            </div>
            <Switch
              id="high-contrast"
              checked={settings.highContrast}
              onCheckedChange={(checked) =>
                updateSetting('highContrast', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="large-text">Large Text</Label>
              <p className="text-xs text-muted-foreground">
                Increases text size throughout the application
              </p>
            </div>
            <Switch
              id="large-text"
              checked={settings.largeText}
              onCheckedChange={(checked) => updateSetting('largeText', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label>Font Size: {settings.fontSize}px</Label>
            <Slider
              value={[settings.fontSize]}
              onValueChange={([value]) => updateSetting('fontSize', value)}
              min={12}
              max={24}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        {/* Motion Settings */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm">Motion</h3>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="reduced-motion">Reduce Motion</Label>
              <p className="text-xs text-muted-foreground">
                Minimizes animations and transitions
              </p>
            </div>
            <Switch
              id="reduced-motion"
              checked={settings.reducedMotion}
              onCheckedChange={(checked) =>
                updateSetting('reducedMotion', checked)
              }
            />
          </div>
        </div>

        {/* Navigation Settings */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm">Navigation</h3>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="focus-indicators">
                Enhanced Focus Indicators
              </Label>
              <p className="text-xs text-muted-foreground">
                Makes keyboard focus more visible
              </p>
            </div>
            <Switch
              id="focus-indicators"
              checked={settings.focusIndicators}
              onCheckedChange={(checked) =>
                updateSetting('focusIndicators', checked)
              }
            />
          </div>
        </div>

        {/* Screen Reader Settings */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm">Screen Reader</h3>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="screen-reader-optimized">
                Screen Reader Optimized
              </Label>
              <p className="text-xs text-muted-foreground">
                Optimizes interface for screen readers
              </p>
            </div>
            <Switch
              id="screen-reader-optimized"
              checked={settings.screenReaderOptimized}
              onCheckedChange={(checked) =>
                updateSetting('screenReaderOptimized', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="announce-changes">Announce Changes</Label>
              <p className="text-xs text-muted-foreground">
                Announces dynamic content changes
              </p>
            </div>
            <Switch
              id="announce-changes"
              checked={settings.announceChanges}
              onCheckedChange={(checked) =>
                updateSetting('announceChanges', checked)
              }
            />
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => setSettings(defaultSettings)}
          className="w-full"
        >
          Reset to Defaults
        </Button>
      </CardContent>
    </Card>
  );
};

// Live region for screen reader announcements
export const LiveRegion: React.FC<{
  message?: string;
  priority?: 'polite' | 'assertive';
  className?: string;
}> = ({ message, priority = 'polite', className }) => (
  <div
    aria-live={priority}
    aria-atomic="true"
    className={cn('sr-only', className)}
  >
    {message}
  </div>
);

// Focus trap component
export const FocusTrap: React.FC<{
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}> = ({ children, active = true, className }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [active]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};

// Accessible button with enhanced feedback
export const AccessibleButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}> = ({
  children,
  onClick,
  disabled,
  loading,
  variant = 'default',
  size = 'default',
  className,
  ariaLabel,
  ariaDescribedBy,
}) => {
  const { settings } = useAccessibility();

  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      variant={variant}
      size={size}
      className={cn(
        settings.focusIndicators &&
          'focus-visible:ring-4 focus-visible:ring-offset-2',
        className
      )}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-busy={loading}
    >
      {children}
    </Button>
  );
};
