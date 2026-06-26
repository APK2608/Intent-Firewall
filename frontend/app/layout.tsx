import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Agent Black Box | Intent Firewall - ArmorIQ Security Operations",
  description:
    "The first cryptographic firewall for autonomous AI agents. Real-time intent verification, action boundary enforcement, and audit logging.",
  keywords: ["AI security", "autonomous agents", "cryptographic intent", "ArmorIQ", "intent firewall"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-[#0a0a0a] text-white`}>
        {children}
      </body>
    </html>
  );
}
