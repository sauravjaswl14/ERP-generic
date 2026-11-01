import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { SITE } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  title: `${SITE.name}: write it once, every department gets a copy`,
  description:
    'Sales, purchasing, inventory, HR and accounting in one system. Confirm a sales order and the stock, the invoice and the ledger update together.',
  openGraph: {
    title: `${SITE.name}: write it once, every department gets a copy`,
    description: 'One ERP for sales, stock, purchasing, HR and accounting, with separate workspaces for each company.',
    type: 'website',
  },
};

export const viewport: Viewport = { themeColor: '#F4F6F3', width: 'device-width', initialScale: 1 };

/**
 * Runs before first paint. Turns on the "anim" class (hero content starts hidden for its entrance)
 * only when motion is welcome, and guarantees the page is revealed even if scripts fail to load.
 */
const bootScript = `(function(){var d=document.documentElement;try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('anim');setTimeout(function(){d.classList.add('ready')},2500)}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
