import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { NebulaProvider } from '@/lib/nebula/provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NebulaDB Next.js Example',
  description: 'A Next.js example using NebulaDB with IndexedDB and SSR fallback',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NebulaProvider>
          {children}
        </NebulaProvider>
      </body>
    </html>
  )
}
