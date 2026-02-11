import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Navigation from '@/components/Navigationbar';
import ThemeWrapper from '@/components/ThemeWrapper';

export const metadata: Metadata = {
  title: 'Generator Monitoring System',
  description: 'Real-time generator monitoring and management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>
          <ThemeWrapper>
            <Navigation />
            <main>{children}</main>
          </ThemeWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
