/**
 * Simple Mock SessionProvider for Testing
 */
import React, { ReactNode } from 'react';

export interface MockSessionProviderProps {
  children: ReactNode;
  session?: any;
}

export const MockSessionProvider: React.FC<MockSessionProviderProps> = ({ 
  children, 
  session = null 
}) => {
  // Create a simple context provider that doesn't use next-auth internals
  return (
    <div data-testid="mock-session-provider" data-session={session ? 'authenticated' : 'unauthenticated'}>
      {children}
    </div>
  );
};

export default MockSessionProvider;
