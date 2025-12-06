import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Market Whisperer - Trading Platform',
  description: 'News and Policy-Aware Trading Platform with Quant Engine',
  icons: {
    icon: [
      { url: '/finance-money-dollar-mobile-svgrepo-com.svg', type: 'image/svg+xml' },
      { url: '/stock.png', type: 'image/png' },
    ],
    apple: [
      { url: '/stock.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}

