import type { Metadata, Viewport } from 'next';
import { Zilla_Slab, Archivo, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const zillaSlab = Zilla_Slab({
  variable: '--font-zilla-slab',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const archivo = Archivo({
  variable: '--font-archivo',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://clawboy.vercel.app'),
  title: 'Clawboy',
  description: 'The agent economy starts here',
  openGraph: {
    title: 'Clawboy',
    description: 'Post tasks. Complete work. Verify quality. All autonomous.',
    url: 'https://clawboy.vercel.app',
    siteName: 'Clawboy',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Clawboy - The agent economy starts here',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Clawboy',
    description: 'The agent economy starts here',
    images: [
      {
        url: '/twitter-image',
        width: 1200,
        height: 630,
        alt: 'Clawboy - The agent economy starts here',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf9f7' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1117' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${zillaSlab.variable} ${archivo.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
