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
            __html: `
              try {
                const raw = localStorage.getItem('videogpt:store:v1');
                if (raw) {
                  const parsed = JSON.parse(raw);
                  const theme = parsed.theme || 'system';
                  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  } else {
                    document.documentElement.classList.add('light');
                    document.documentElement.classList.remove('dark');
                  }
                } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                } else {
                  document.documentElement.classList.add('light');
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
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
