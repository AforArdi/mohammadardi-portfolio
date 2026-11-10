"use client";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

export default function PortfolioAtmosphere() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const drift = useTransform(scrollYProgress, [0, 1], [0, -90]);
  return <><div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
    <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
    <motion.div style={{ y: reduced ? 0 : drift }} className="absolute -top-32 -right-32 h-[70vh] w-[65vw] rounded-full bg-[radial-gradient(ellipse,hsl(var(--primary)/0.07),transparent_65%)]" />
    <div className="absolute -left-32 bottom-0 h-[60vh] w-[60vw] bg-[radial-gradient(ellipse,hsl(var(--primary)/0.05),transparent_65%)]" />
  </div>
    {!reduced && <motion.div aria-hidden="true" style={{ scaleX: scrollYProgress, transformOrigin: "left" }} className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 bg-primary/70" />}
  </>;
}
