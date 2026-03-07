import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VALSEA — Voice Analysis Engine",
  description:
    "Decode intent, emotion, cultural nuance and security threats from any conversation.",
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
