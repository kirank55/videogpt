import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/layout/Sidebar";
import { FirefoxWarning } from "@/components/layout/FirefoxWarning";
import { HydrateStore } from "@/components/HydrateStore";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "VideoGPT - Free Video Generator",
  description:
    "Text to short-form visuals and animated previews in one AI-powered Video Generation Platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased dark`}
    >
      <body className="h-full overflow-hidden">
        {/* HydrateStore must render before any page component that reads from the store. */}
        <HydrateStore />
        <div className="shell">
          <Sidebar />
          <section className="flex h-dvh flex-col overflow-hidden p-6 md:p-10">
            <FirefoxWarning />
            {children}
          </section>
        </div>
      </body>
    </html>
  );
}
