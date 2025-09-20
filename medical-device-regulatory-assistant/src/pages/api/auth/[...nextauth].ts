import NextAuth from 'next-auth';

import { authOptions } from '@/lib/auth';

// Enhanced NextAuth handler with React 19 compatibility
const handler = NextAuth(authOptions);

// Export both GET and POST handlers for React 19 compatibility
export { handler as GET, handler as POST };

// Default export for backward compatibility
export default handler;
