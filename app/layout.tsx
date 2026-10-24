import type { Metadata } from "next";
import localFont from "next/font/local";

import { AppHeader } from "@/components/AppHeader";
import { themeBootScript } from "@/lib/theme";

import { Providers } from "./providers";
import "./globals.scss";

/**
 * IBM Plex Sans is self-hosted from the @ibm/plex-sans package rather than
 * fetched from Google Fonts, so the build needs no network and viewers' browsers
 * make no third-party request.
 */
const plex = localFont({
  src: [
    {
      path: "../node_modules/@ibm/plex-sans/fonts/complete/woff2/IBMPlexSans-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/@ibm/plex-sans/fonts/complete/woff2/IBMPlexSans-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-plex",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Dev Diary",
  description: "Turn your merged pull requests into a developer diary, chunked by timeframe.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The boot script may set data-theme before hydration, so React is told not
    // to treat that attribute mismatch as an error.
    <html lang="en" className={plex.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <Providers>
          <AppHeader />
          <main className="app-main">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
