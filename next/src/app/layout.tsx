import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Sidebar } from "@/components/layout/Sidebar";
import { HydrateStore } from "@/components/HydrateStore";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VideoGPT Studio",
  description:
    "Shape short-form visuals, prompts, and animated previews in one AI-powered workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/*
          HydrateStore must render before any page component that reads from
          the store.  It is a "use client" leaf — safe inside a server layout.
        */}
        <HydrateStore />
        <div className="shell">
          <Sidebar />
          <section className="flex min-h-screen flex-col p-6 md:p-10">
            {children}
          </section>
        </div>
      </body>
    </html>
  );
}
