import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, VT323 } from "next/font/google";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-plex",
  display: "swap",
});

const vt323 = VT323({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-vt",
  display: "swap",
});

export const metadata: Metadata = {
  title: "JAZ://BRAIN_OS",
  description: "private neural interface. authorized personnel only.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#060310",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexMono.variable} ${vt323.variable}`}>
      <body className="bg-abyss text-ink font-term min-h-dvh antialiased">{children}</body>
    </html>
  );
}
