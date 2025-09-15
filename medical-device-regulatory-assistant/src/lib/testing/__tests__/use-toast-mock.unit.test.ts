/**
 * Test file to validate useToast mock structure
 * Ensures the mock matches the actual implementation interface
 */

import { useToastMock, toastMockUtils } from '../use-toast-mock';
import { setupUseToastMock, cleanupUseToastMock } from '../setup-use-toast-mock';

describe('useToast Mock Structure', () => {
  beforeEach(() => {
    // Clear and reset before each test
    toastMockUtils.clear();
    toastMockUtils.resetMocks();
    setupUseToastMock();
  });

  afterEach(() => {
    cleanupUseToastMock();
  });

  describe('Mock Structure Validation', () => {
    it('should provide all required useToast return properties', () => {
      const mockReturn = useToastMock.useToast();

      // Check state properties
      expect(mockReturn).toHaveProperty('toasts');
      expect(mockReturn).toHaveProperty('queue');
      expect(mockReturn).toHaveProperty('rateLimitCount');
      expect(mockReturn).toHaveProperty('lastResetTime');

      // Check function properties
      expect(mockReturn).toHaveProperty('toast');
      expect(mockReturn).toHaveProperty('contextualToast');
      expect(mockReturn).toHaveProperty('dismiss');
      expect(mockReturn).toHaveProperty('dismissAll');
      expect(mockReturn).toHaveProperty('clearQueue');
      expect(mockReturn).toHaveProperty('getToastsByCategory');
      expect(mockReturn).toHaveProperty('getToastsByPriority');

      // Verify functions are jest mocks
      expect(jest.isMockFunction(mockReturn.toast)).toBe(true);
      expect(jest.isMockFunction(mockReturn.dismiss)).toBe(true);
      expect(jest.isMockFunction(mockReturn.dismissAll)).toBe(true);
      expect(jest.isMockFunction(mockReturn.clearQueue)).toBe(true);
      expect(jest.isMockFunction(mockReturn.getToastsByCategory)).toBe(true);
      expect(jest.isMockFunction(mockReturn.getToastsByPriority)).toBe(true);
    });

    it('should provide all contextual toast methods', () => {
      const mockReturn = useToastMock.useToast();
      const contextualToast = mockReturn.contextualToast;

      // Check all contextual toast methods exist
      expect(contextualToast).toHaveProperty('fdaApiError');
      expect(contextualToast).toHaveProperty('predicateSearchFailed');
      expect(contextualToast).toHaveProperty('classificationError');
      expect(contextualToast).toHaveProperty('projectSaveFailed');
      expect(contextualToast).toHaveProperty('exportFailed');
      expect(contextualToast).toHaveProperty('validationError');
      expect(contextualToast).toHaveProperty('authExpired');
      expect(contextualToast).toHaveProperty('networkError');
      expect(contextualToast).toHaveProperty('progress');
      expect(contextualToast).toHaveProperty('success');
      expect(contextualToast).toHaveProperty('info');

      // Verify all are jest mocks
      Object.values(contextualToast).forEach(method => {
        expect(jest.isMockFunction(method)).toBe(true);
      });
    });

    it('should return toast object with correct methods when toast is called', () => {
      const mockReturn = useToastMock.useToast();
      
      const toastResult = mockReturn.toast({
        title: 'Test Toast',
        description: 'Test description',
        variant: 'success',
      });

      expect(toastResult).toHaveProperty('id');
      expect(toastResult).toHaveProperty('dismiss');
      expect(toastResult).toHaveProperty('update');
      expect(toastResult).toHaveProperty('retry');
      expect(toastResult).toHaveProperty('updateProgress');

      expect(typeof toastResult.id).toBe('string');
      expect(typeof toastResult.dismiss).toBe('function');
      expect(typeof toastResult.update).toBe('function');
      expect(typeof toastResult.retry).toBe('function');
      expect(typeof toastResult.updateProgress).toBe('function');
    });
  });

  describe('Mock Functionality', () => {
    it('should track toast calls correctly', () => {
      const mockReturn = useToastMock.useToast();
      
      expect(toastMockUtils.getCallCount()).toBe(0);

      mockReturn.toast({
        title: 'Test Toast 1',
        description: 'First test toast',
        variant: 'success',
      });

      expect(toastMockUtils.getCallCount()).toBe(1);

      mockReturn.toast({
        title: 'Test Toast 2',
        description: 'Second test toast',
        variant: 'destructive',
      });

      expect(toastMockUtils.getCallCount()).toBe(2);

      const calls = toastMockUtils.getCalls();
      expect(calls).toHaveLength(2);
      expect(calls[0].title).toBe('Test Toast 1');
      expect(calls[1].title).toBe('Test Toast 2');
    });

    it('should track contextual toast calls', () => {
      const mockReturn = useToastMock.useToast();
      
      mockReturn.contextualToast.fdaApiError();
      mockReturn.contextualToast.validationError('Custom validation message');
      mockReturn.contextualToast.success('Operation completed');

      expect(toastMockUtils.getCallCount()).toBe(3);

      const calls = toastMockUtils.getCalls();
      expect(calls[0].title).toBe('FDA API Connection Failed');
      expect(calls[1].title).toBe('Validation Error');
      expect(calls[1].description).toBe('Custom validation message');
      expect(calls[2].title).toBe('Operation completed');
    });

    it('should filter calls by variant correctly', () => {
      const mockReturn = useToastMock.useToast();
      
      mockReturn.toast({ title: 'Success', variant: 'success' });
      mockReturn.toast({ title: 'Error', variant: 'destructive' });
      mockReturn.toast({ title: 'Warning', variant: 'warning' });
      mockReturn.toast({ title: 'Another Success', variant: 'success' });

      const successCalls = toastMockUtils.getCallsByVariant('success');
      const errorCalls = toastMockUtils.getCallsByVariant('destructive');
      const warningCalls = toastMockUtils.getCallsByVariant('warning');

      expect(successCalls).toHaveLength(2);
      expect(errorCalls).toHaveLength(1);
      expect(warningCalls).toHaveLength(1);
    });

    it('should filter calls by category correctly', () => {
      const mockReturn = useToastMock.useToast();
      
      mockReturn.contextualToast.fdaApiError(); // category: 'api'
      mockReturn.contextualToast.validationError(); // category: 'validation'
      mockReturn.contextualToast.projectSaveFailed(); // category: 'user'
      mockReturn.contextualToast.networkError(); // category: 'system'

      const apiCalls = toastMockUtils.getCallsByCategory('api');
      const validationCalls = toastMockUtils.getCallsByCategory('validation');
      const userCalls = toastMockUtils.getCallsByCategory('user');
      const systemCalls = toastMockUtils.getCallsByCategory('system');

      expect(apiCalls).toHaveLength(1);
      expect(validationCalls).toHaveLength(1);
      expect(userCalls).toHaveLength(1);
      expect(systemCalls).toHaveLength(1);
    });

    it('should check if toast was called with specific content', () => {
      const mockReturn = useToastMock.useToast();
      
      mockReturn.toast({
        title: 'Specific Title',
        description: 'Specific Description',
        variant: 'info',
      });

      expect(toastMockUtils.wasCalledWith('Specific Title')).toBe(true);
      expect(toastMockUtils.wasCalledWith('Specific Title', 'Specific Description')).toBe(true);
      expect(toastMockUtils.wasCalledWith('Specific Title', 'Specific Description', 'info')).toBe(true);
      expect(toastMockUtils.wasCalledWith('Wrong Title')).toBe(false);
      expect(toastMockUtils.wasCalledWith('Specific Title', 'Wrong Description')).toBe(false);
    });

    it('should clear mock data correctly', () => {
      const mockReturn = useToastMock.useToast();
      
      mockReturn.toast({ title: 'Test' });
      mockReturn.contextualToast.success('Success');

      expect(toastMockUtils.getCallCount()).toBe(2);

      toastMockUtils.clear();

      expect(toastMockUtils.getCallCount()).toBe(0);
      expect(toastMockUtils.getCalls()).toHaveLength(0);
    });

    it('should reset mocks correctly', () => {
      const mockReturn = useToastMock.useToast();
      
      mockReturn.toast({ title: 'Test' });
      mockReturn.dismiss('test-id');
      mockReturn.contextualToast.success('Success');

      // contextualToast.success calls the main toast function internally, so expect 2 calls
      expect(mockReturn.toast).toHaveBeenCalledTimes(2);
      expect(mockReturn.dismiss).toHaveBeenCalledTimes(1);
      expect(mockReturn.contextualToast.success).toHaveBeenCalledTimes(1);

      toastMockUtils.resetMocks();

      expect(mockReturn.toast).toHaveBeenCalledTimes(0);
      expect(mockReturn.dismiss).toHaveBeenCalledTimes(0);
      expect(mockReturn.contextualToast.success).toHaveBeenCalledTimes(0);
    });
  });

  describe('Mock State Management', () => {
    it('should maintain mock state correctly', () => {
      const mockReturn = useToastMock.useToast();
      
      // Initial state should be empty
      expect(mockReturn.toasts).toHaveLength(0);
      expect(mockReturn.queue).toHaveLength(0);
      expect(mockReturn.rateLimitCount).toBe(0);

      // Add a toast
      mockReturn.toast({ title: 'Test Toast' });

      // State should be updated
      expect(mockReturn.toasts).toHaveLength(1);
      expect(mockReturn.toasts[0].title).toBe('Test Toast');
    });

    it('should handle getToastsByCategory correctly', () => {
      const mockReturn = useToastMock.useToast();
      
      mockReturn.contextualToast.fdaApiError(); // category: 'api'
      mockReturn.contextualToast.validationError(); // category: 'validation'
      mockReturn.contextualToast.networkError(); // category: 'system'

      const apiToasts = mockReturn.getToastsByCategory('api');
      const validationToasts = mockReturn.getToastsByCategory('validation');
      const systemToasts = mockReturn.getToastsByCategory('system');

      expect(apiToasts).toHaveLength(1);
      expect(validationToasts).toHaveLength(1);
      expect(systemToasts).toHaveLength(1);
    });

    it('should handle getToastsByPriority correctly', () => {
      const mockReturn = useToastMock.useToast();
      
      mockReturn.contextualToast.fdaApiError(); // priority: 'high'
      mockReturn.contextualToast.projectSaveFailed(); // priority: 'critical'
      mockReturn.contextualToast.info('Info message'); // priority: 'low'

      const highPriorityToasts = mockReturn.getToastsByPriority('high');
      const criticalPriorityToasts = mockReturn.getToastsByPriority('critical');
      const lowPriorityToasts = mockReturn.getToastsByPriority('low');

      expect(highPriorityToasts).toHaveLength(1);
      expect(criticalPriorityToasts).toHaveLength(1);
      expect(lowPriorityToasts).toHaveLength(1);
    });
  });

  describe('Integration with Jest Mocks', () => {
    it('should work with jest mock assertions', () => {
      const mockReturn = useToastMock.useToast();
      
      mockReturn.toast({ title: 'Test' });
      mockReturn.dismiss('test-id');
      mockReturn.contextualToast.success('Success');

      expect(mockReturn.toast).toHaveBeenCalledWith({ title: 'Test' });
      expect(mockReturn.dismiss).toHaveBeenCalledWith('test-id');
      expect(mockReturn.contextualToast.success).toHaveBeenCalledWith('Success');

      // contextualToast.success calls the main toast function internally, so expect 2 calls
      expect(mockReturn.toast).toHaveBeenCalledTimes(2);
      expect(mockReturn.dismiss).toHaveBeenCalledTimes(1);
      expect(mockReturn.contextualToast.success).toHaveBeenCalledTimes(1);
    });

    it('should support jest mock return values', () => {
      const mockReturn = useToastMock.useToast();
      
      // Mock a specific return value
      (mockReturn.getToastsByCategory as jest.Mock).mockReturnValue([
        { id: 'test', title: 'Mocked Toast', category: 'test' }
      ]);

      const result = mockReturn.getToastsByCategory('test');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Mocked Toast');
    });
  });
});