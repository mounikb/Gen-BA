import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fields of Hoops",
  description:
    "NBA game shot data transformed into abstract art posters. Every game, a unique composition.",
  openGraph: {
    title: "Fields of Hoops",
    description: "NBA shot data as generative art posters.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={GeistMono.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
