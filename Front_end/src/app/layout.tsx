import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Navigation from '@/components/Navigationbar';

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
          <Navigation />
          <br /><br />
          <main className="min-h-screen">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
