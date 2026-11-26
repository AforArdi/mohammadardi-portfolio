"use client";

import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" storageKey="portfolio-theme" defaultTheme="dark" enableSystem={false} enableColorScheme={false} disableTransitionOnChange>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeProvider>
  );
}
