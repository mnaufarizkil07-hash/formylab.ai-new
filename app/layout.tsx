import type { Metadata } from "next";
import { Instrument_Sans, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import FloatingChatWidget from "../components/FloatingChatWidget";
import SmoothLoader from "../components/SmoothLoader";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "formylab.ai",
  description: "Cosmetic Formulation & R&D Lab Prototyping Workspace",
  openGraph: {
    title: "formylab.ai",
    description: "Cosmetic Formulation & R&D Lab Prototyping Workspace",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`h-full antialiased ${instrumentSans.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Plus+Jakarta+Sans:wght@400..800&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col relative font-sans bg-[#eaf9f2] text-[#0B2B26]">
        <SmoothLoader />
        {children}
        <FloatingChatWidget />
      </body>
    </html>
  );
}
