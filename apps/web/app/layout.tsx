import type { Metadata } from 'next';
import './globals.css';
import './themes.css';

export const metadata: Metadata = { title: 'ProofLens AI — Check Before You Trust', description: 'Evidence-based checks for suspicious links and messages.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
