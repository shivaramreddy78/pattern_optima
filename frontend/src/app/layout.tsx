import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pattern Optima | AI Powered Smart 2D Fabric Nesting Platform',
  description: 'Optimize fabric utilization, reduce textile waste by 10%, and increase profit margins using our next-generation AI-powered 2D nesting optimization engine. Built for garment manufacturers and fashion designers.',
  keywords: ['fabric nesting', 'garment cutting', 'pattern optimization', 'textile software', 'sustainable fashion', 'AI manufacturing'],
  authors: [{ name: 'Team Pattern Optima' }],
  openGraph: {
    title: 'Pattern Optima | AI Powered Smart 2D Fabric Nesting',
    description: 'Reduce fabric waste by 10%. Increase profit. Optimize every cut. Premium AI-powered 2D nesting for garment manufacturers.',
    url: 'https://patternoptima.ai',
    siteName: 'Pattern Optima',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pattern Optima | AI 2D Fabric Nesting Platform',
    description: 'Smart AI fabric nesting platform for textile manufacturers and fashion designer MSMEs.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        {/* Modern font imports */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background text-gray-100 min-h-screen relative antialiased">
        <AuthProvider>
          <LanguageProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
