import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from '../use-auto-save';

describe('useAutoSave', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('calls onSave after delay when content changes', async () => {
    const mockOnSave = jest.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ content }) => useAutoSave(content, { onSave: mockOnSave }),
      { initialProps: { content: 'initial content' } }
    );

    // Change content
    rerender({ content: 'updated content' });

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(2500);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockOnSave).toHaveBeenCalledWith('updated content');
  });

  it('does not call onSave if content has not changed', () => {
    const mockOnSave = jest.fn().mockResolvedValue(undefined);
    renderHook(() => useAutoSave('same content', { onSave: mockOnSave }));

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('debounces multiple rapid changes', async () => {
    const mockOnSave = jest.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ content }) => useAutoSave(content, { onSave: mockOnSave }),
      { initialProps: { content: 'initial' } }
    );

    // Make multiple rapid changes
    rerender({ content: 'change1' });
    act(() => {
      jest.advanceTimersByTime(500);
    });

    rerender({ content: 'change2' });
    act(() => {
      jest.advanceTimersByTime(500);
    });

    rerender({ content: 'final change' });
    act(() => {
      jest.advanceTimersByTime(2500);
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Should only save the final change
    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSave).toHaveBeenCalledWith('final change');
  });

  it('uses custom delay when provided', async () => {
    const mockOnSave = jest.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ content }) => useAutoSave(content, { onSave: mockOnSave, delay: 5000 }),
      { initialProps: { content: 'initial' } }
    );

    rerender({ content: 'updated' });

    // Should not save after default delay
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(mockOnSave).not.toHaveBeenCalled();

    // Should save after custom delay
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockOnSave).toHaveBeenCalledWith('updated');
  });

  it('does not save when disabled', () => {
    const mockOnSave = jest.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ content }) => useAutoSave(content, { onSave: mockOnSave, enabled: false }),
      { initialProps: { content: 'initial' } }
    );

    rerender({ content: 'updated' });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('provides saveNow function for manual save', async () => {
    const mockOnSave = jest.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ content }) => useAutoSave(content, { onSave: mockOnSave }),
      { initialProps: { content: 'initial' } }
    );

    rerender({ content: 'updated' });

    // Call saveNow immediately
    await act(async () => {
      await result.current.saveNow();
    });

    expect(mockOnSave).toHaveBeenCalledWith('updated');
  });

  it('cancels pending save when saveNow is called', async () => {
    const mockOnSave = jest.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ content }) => useAutoSave(content, { onSave: mockOnSave }),
      { initialProps: { content: 'initial' } }
    );

    rerender({ content: 'updated' });

    // Call saveNow before auto-save timer
    await act(async () => {
      await result.current.saveNow();
    });

    // Advance timer past auto-save delay
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Should only have been called once (from saveNow)
    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  it('handles save errors gracefully', async () => {
    const mockOnSave = jest.fn().mockRejectedValue(new Error('Save failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    const { rerender } = renderHook(
      ({ content }) => useAutoSave(content, { onSave: mockOnSave }),
      { initialProps: { content: 'initial' } }
    );

    rerender({ content: 'updated' });

    act(() => {
      jest.advanceTimersByTime(2500);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Auto-save failed:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('prevents concurrent saves', async () => {
    let resolveFirstSave: () => void;
    const firstSavePromise = new Promise<void>((resolve) => {
      resolveFirstSave = resolve;
    });

    const mockOnSave = jest.fn()
      .mockReturnValueOnce(firstSavePromise)
      .mockResolvedValue(undefined);

    const { result, rerender } = renderHook(
      ({ content }) => useAutoSave(content, { onSave: mockOnSave }),
      { initialProps: { content: 'initial' } }
    );

    // Start first save
    rerender({ content: 'first change' });
    act(() => {
      jest.advanceTimersByTime(2500);
    });

    // Try to start second save while first is in progress
    rerender({ content: 'second change' });
    act(() => {
      jest.advanceTimersByTime(2500);
    });

    // Should only have called save once
    expect(mockOnSave).toHaveBeenCalledTimes(1);

    // Resolve first save
    act(() => {
      resolveFirstSave!();
    });

    await act(async () => {
      await Promise.resolve();
    });
  });

  it('cleans up timers on unmount', () => {
    const mockOnSave = jest.fn().mockResolvedValue(undefined);
    const { unmount, rerender } = renderHook(
      ({ content }) => useAutoSave(content, { onSave: mockOnSave }),
      { initialProps: { content: 'initial' } }
    );

    rerender({ content: 'updated' });
    unmount();

    // Advance timer after unmount
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Should not save after unmount
    expect(mockOnSave).not.toHaveBeenCalled();
  });
});