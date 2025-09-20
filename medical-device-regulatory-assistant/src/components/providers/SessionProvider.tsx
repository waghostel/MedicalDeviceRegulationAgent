'use client';

import { Session } from 'next-auth';
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

interface SessionProviderProps {
  children: React.ReactNode;
  session: Session | null;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({
  children,
  session,
}) => (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  );
