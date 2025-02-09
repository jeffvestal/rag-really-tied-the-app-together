import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider"; // ✅ Named import
import EventListenerProvider from "@/components/EventListenerProvider"; // ✅ New Client Component

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "The Rag Really Ties the App Together",
  description: "A modern search interface",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <EventListenerProvider> {/* ✅ Fixes hydration issues */}
            {children}
          </EventListenerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
