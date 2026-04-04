import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "./globals.css";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    template: "%s — Buckt",
    default: "Buckt",
  },
  description: "Branded S3 buckets on demand",
  openGraph: {
    title: "Buckt",
    description: "Branded S3 buckets on demand",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={cn("dark h-full antialiased", sans.variable, mono.variable)}
      lang="en"
    >
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
