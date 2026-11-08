import type { CSSProperties } from "react";
import { SiHtml5, SiCss, SiTailwindcss, SiJavascript, SiReact, SiNextdotjs, SiExpress, SiMongodb, SiJsonwebtokens } from "react-icons/si";
import { Network, ShieldCheck } from "lucide-react";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

const skills = [
  { name: "HTML", icon: SiHtml5, color: "#E34F26" },
  { name: "CSS", icon: SiCss, color: "#1572B6" },
  { name: "Tailwind CSS", icon: SiTailwindcss, color: "#38BDF8" },
  { name: "JavaScript (ES6+)", icon: SiJavascript, color: "#F7DF1E" },
  { name: "React", icon: SiReact, color: "#61DAFB" },
  { name: "Next.js", icon: SiNextdotjs, color: "#FFFFFF" },
  { name: "Express.js", icon: SiExpress, color: "#FFFFFF" },
  { name: "REST APIs", icon: Network, color: "#A78BFA" },
  { name: "MongoDB", icon: SiMongodb, color: "#47A248" },
  { name: "BetterAuth", icon: ShieldCheck, color: "#C084FC" },
  { name: "JWT Security", icon: SiJsonwebtokens, color: "#D946EF" },
];

export default function SkillsSection() {
  return (
    <section id="skills" className="py-20 md:py-24 relative">
      <div aria-hidden="true" className="absolute top-1/4 left-10 w-32 h-32 dot-pattern opacity-20 hidden lg:block" />
      <div className="container mx-auto px-6">
        <SectionHeading>skills</SectionHeading>
        <Reveal>
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5 max-w-5xl mx-auto">
            {skills.map(({ name, icon: Icon, color }) => (
              <li key={name} style={{ "--skill-color": color } as CSSProperties} className="skill-tile group relative flex flex-col items-center justify-center gap-3 p-5 sm:p-6 rounded-xl border border-border/60 bg-card/40 min-h-32">
                <Icon size={40} color={color} aria-hidden="true" className="relative transition-transform duration-300 group-hover:scale-110" />
                <span className="relative font-mono text-xs sm:text-sm text-muted-foreground text-center group-hover:text-foreground transition-colors">{name}</span>
              </li>
            ))}
          </ul>
        </Reveal>
        <div aria-hidden="true" className="mt-16 flex justify-center items-center gap-4">
          <div className="w-16 sm:w-24 h-px bg-gradient-to-r from-transparent to-primary/50" /><span className="text-primary font-mono text-sm">always learning</span><div className="w-16 sm:w-24 h-px bg-gradient-to-l from-transparent to-primary/50" />
        </div>
      </div>
    </section>
  );
}
