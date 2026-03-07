import type { Metadata } from "next";
// @ts-ignore
import "./globals.css";

export const metadata: Metadata = {
  title: "VALSEA — Speech Intelligence Platform",
  description:
    "Real-time voice analysis engine. Decode intent, emotion, cultural nuance and security threats from any conversation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
