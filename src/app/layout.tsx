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

// Stamps data-theme from localStorage BEFORE first paint so a re-skinned brain
// never flashes factory pink. Runs pre-hydration as a parser-blocking script.
// Key must match KEY in src/lib/prefs.ts ("bos_prefs_v1") — server components
// can't import from that client module, hence the duplicate.
const THEME_BOOT_SCRIPT = `try{var p=JSON.parse(localStorage.getItem("bos_prefs_v1"));if(p&&typeof p.theme==="string")document.documentElement.dataset.theme=p.theme}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: data-theme is set client-side pre-hydration,
    // so the attribute legitimately differs from the server-rendered html tag
    <html lang="en" className={`${plexMono.variable} ${vt323.variable}`} suppressHydrationWarning>
      <body className="bg-abyss text-ink font-term min-h-dvh antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
