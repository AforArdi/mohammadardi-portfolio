import type { CSSProperties } from "react";
import Image from "next/image";
import type { PublicPortfolio } from "@/lib/content/public";
import { iconRegistry } from "@/lib/content/icons";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

export default function SkillsSection({ skills }: { skills: PublicPortfolio["skills"] }) {
  if (!skills.length) return null;
  return <section id="skills" className="py-20 md:py-24 relative"><div aria-hidden="true" className="absolute top-1/4 left-10 w-32 h-32 dot-pattern opacity-20 hidden lg:block" /><div className="container mx-auto px-6">
    <SectionHeading>skills</SectionHeading>
    <Reveal><ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5 max-w-5xl mx-auto">{skills.map(skill => {
      const Icon = iconRegistry[skill.iconKey || ""] || iconRegistry["lucide:code"];
      return <li key={skill.id} style={{ "--skill-color": skill.color } as CSSProperties} className="skill-tile group relative flex flex-col items-center justify-center gap-3 p-5 sm:p-6 rounded-xl border border-border/60 bg-card/40 min-h-32">
        {skill.customIconUrl ? <Image src={skill.customIconUrl} width={40} height={40} alt="" unoptimized className="relative w-10 h-10 object-contain transition-transform group-hover:scale-110" /> : <Icon size={40} color={skill.color} aria-hidden className="relative transition-transform duration-300 group-hover:scale-110" />}
        <span className="relative font-mono text-xs sm:text-sm text-muted-foreground text-center group-hover:text-foreground transition-colors">{skill.name}</span>
      </li>;
    })}</ul></Reveal>
    <div aria-hidden className="mt-16 flex justify-center items-center gap-4"><div className="w-16 sm:w-24 h-px bg-gradient-to-r from-transparent to-primary/50" /><span className="text-primary font-mono text-sm">always learning</span><div className="w-16 sm:w-24 h-px bg-gradient-to-l from-transparent to-primary/50" /></div>
  </div></section>;
}
