"use client";
import { motion, useReducedMotion } from "motion/react";

/** Server-rendered content remains visible, including without JavaScript. */
export default function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const reducedMotion = useReducedMotion();
  return <motion.div initial={false} whileInView={reducedMotion ? undefined : { y: [12, 0] }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.5 }} className={className}>{children}</motion.div>;
}
