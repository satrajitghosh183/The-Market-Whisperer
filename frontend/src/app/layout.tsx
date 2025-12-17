import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Market Whisperer',
  description: 'Intelligent Trading Simulation Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

