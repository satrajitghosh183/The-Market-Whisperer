import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { AuthProvider } from "@/lib/authContext";

export const metadata: Metadata = {
  title: "AI News & Policy-Aware Trading Simulator",
  description: "Frontend simulator with mock APIs and AI explanation UI"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <AuthProvider>
          <div className="container py-6">
            <Header />
            {children}
            <footer className="mt-16 text-center text-xs text-gray-400">
              Built with real backend integration and Yahoo Finance data.
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
