import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { ShellLayout } from "@/components/layout/ShellLayout";
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
  title: "VideoGPT - Free Video Generator",
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
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('dark');`,
          }}
        />
      </head>
      <body className="h-full overflow-hidden">
        {/*
          HydrateStore must render before any page component that reads from
          the store.  It is a "use client" leaf — safe inside a server layout.
        */}
        <HydrateStore />
        <ShellLayout>{children}</ShellLayout>
      </body>
    </html>
  );
}
