import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'PolyApp Storefront',
  description: 'The public catalog of one PolyApp tenant.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <a href="/" className="site-title">
            PolyApp Storefront
          </a>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
