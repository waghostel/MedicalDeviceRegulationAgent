/**
 * Simple TestProviders component that avoids next-auth compatibility issues
 */
import React, { ReactNode } from 'react';

export interface SimpleTestProvidersProps {
  children: ReactNode;
  session?: any;
}

export const SimpleTestProviders: React.FC<SimpleTestProvidersProps> = ({
  children,
  session = null,
}) => {
  return <div data-testid="simple-test-providers">{children}</div>;
};

export default SimpleTestProviders;
