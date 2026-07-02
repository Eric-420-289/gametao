import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Liar Dice Online',
  description: 'Play Liar’s Dice with friends instantly without sign up.'
};

const themeScript = `(${String(() => {
  const theme = localStorage.getItem('theme') || (window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
})})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Mali:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;1,200;1,300;1,400;1,500;1,600;1,700&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
