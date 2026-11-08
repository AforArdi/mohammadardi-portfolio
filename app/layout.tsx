import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Providers from "@/components/Providers";
import "@/index.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const title = "Ardi — Full Stack Developer";
const description = "Md Miftahul Islam Ardi — web developer building modern full-stack applications with React, Next.js, Node.js, and MongoDB. Explore my projects, skills, and achievements.";

export const metadata: Metadata = {
  metadataBase: new URL("https://mohammadardi.online"),
  title: { default: title, template: "%s | Ardi" },
  description,
  alternates: { canonical: "/" },
  openGraph: { title, description, url: "/", siteName: "Ardi Portfolio", type: "website", locale: "en_US" },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = { themeColor: "#080c17", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${mono.variable}`}>
      <body>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
