import { useCallback, useEffect, useRef } from 'react';

interface UseAutoSaveOptions {
  delay?: number; // Delay in milliseconds (default: 2000)
  onSave: (content: string) => Promise<void> | void;
  enabled?: boolean;
}

export function useAutoSave(content: string, options: UseAutoSaveOptions) {
  const { delay = 2000, onSave, enabled = true } = options;
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedContentRef = useRef<string>(content);
  const isSavingRef = useRef<boolean>(false);

  const debouncedSave = useCallback(async () => {
    if (!enabled || isSavingRef.current) return;

    // Only save if content has actually changed
    if (content === lastSavedContentRef.current) return;

    try {
      isSavingRef.current = true;
      await onSave(content);
      lastSavedContentRef.current = content;
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      isSavingRef.current = false;
    }
  }, [content, onSave, enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(debouncedSave, delay);

    // Cleanup on unmount or dependency change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, delay, debouncedSave, enabled]);

  // Manual save function
  const saveNow = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    await debouncedSave();
  }, [debouncedSave]);

  return {
    saveNow,
    isSaving: isSavingRef.current
  };
}