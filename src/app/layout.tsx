import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'CapyCode - AI Mobile App Generator',
  description: 'Generate, preview, and deploy mobile apps with AI in one click',
  keywords: ['mobile app', 'react native', 'expo', 'ai', 'code generation', 'app builder'],
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'CapyCode - AI Mobile App Generator',
    description: 'Generate, preview, and deploy mobile apps with AI in one click',
    images: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="HandheldFriendly" content="true" />
        <style dangerouslySetInnerHTML={{ __html: `
          * { 
            touch-action: pan-x pan-y;
            -ms-touch-action: pan-x pan-y;
          }
          html, body {
            touch-action: pan-x pan-y;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
          }
        `}} />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster 
            position="bottom-right"
            toastOptions={{
              className: 'bg-surface-800 text-surface-100 border border-surface-700',
              duration: 4000,
            }}
          />
        </Providers>

        {/* Global zoom prevention script */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            // Prevent pinch zoom
            document.addEventListener('gesturestart', function(e) { e.preventDefault(); }, { passive: false });
            document.addEventListener('gesturechange', function(e) { e.preventDefault(); }, { passive: false });
            document.addEventListener('gestureend', function(e) { e.preventDefault(); }, { passive: false });
            
            // Prevent touchmove with 2+ fingers (pinch)
            document.addEventListener('touchmove', function(e) {
              if (e.touches.length > 1) { e.preventDefault(); }
            }, { passive: false });
            
            // Prevent double-tap zoom
            var lastTap = 0;
            document.addEventListener('touchend', function(e) {
              var now = Date.now();
              if (now - lastTap < 300) { e.preventDefault(); }
              lastTap = now;
            }, { passive: false });
            
            // Prevent ctrl+wheel zoom
            document.addEventListener('wheel', function(e) {
              if (e.ctrlKey) { e.preventDefault(); }
            }, { passive: false });
            
            // Prevent keyboard zoom
            document.addEventListener('keydown', function(e) {
              if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
                e.preventDefault();
              }
            });
            
            // Disable right-click context menu
            document.addEventListener('contextmenu', function(e) {
              e.preventDefault();
              return false;
            });
          })();
        `}} />
      </body>
    </html>
  );
}
