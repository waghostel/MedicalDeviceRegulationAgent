import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { getServerSession } from 'next-auth';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { ProjectContextProvider } from '@/components/providers/ProjectContextProvider';
import { Toaster } from '@/components/ui/toaster';
import { authOptions } from '@/lib/auth';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Medical Device Regulatory Assistant',
  description: 'AI-powered regulatory assistant for medical device companies',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider session={session}>
          <ProjectContextProvider>
            {children}
            <Toaster />
          </ProjectContextProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
