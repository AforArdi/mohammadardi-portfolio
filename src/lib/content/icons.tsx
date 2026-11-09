import type { ComponentType } from "react";
import { SiHtml5, SiCss, SiTailwindcss, SiJavascript, SiTypescript, SiReact, SiNextdotjs, SiExpress, SiMongodb, SiJsonwebtokens, SiNodedotjs, SiPython, SiGit, SiGithub, SiPostgresql, SiSupabase, SiDocker } from "react-icons/si";
import { Network, ShieldCheck, Globe, Code, Database, Server, Terminal, Award, Github, Linkedin, Instagram, Facebook, Youtube, Mail } from "lucide-react";

export const iconRegistry: Record<string, ComponentType<{ size?: number; color?: string; className?: string; "aria-hidden"?: boolean }>> = {
  "simple-icons:html5": SiHtml5, "simple-icons:css": SiCss, "simple-icons:tailwindcss": SiTailwindcss,
  "simple-icons:javascript": SiJavascript, "simple-icons:typescript": SiTypescript, "simple-icons:react": SiReact,
  "simple-icons:nextdotjs": SiNextdotjs, "simple-icons:express": SiExpress, "simple-icons:mongodb": SiMongodb,
  "simple-icons:jsonwebtokens": SiJsonwebtokens, "simple-icons:nodedotjs": SiNodedotjs, "simple-icons:python": SiPython,
  "simple-icons:git": SiGit, "simple-icons:github": SiGithub, "simple-icons:postgresql": SiPostgresql,
  "simple-icons:supabase": SiSupabase, "simple-icons:docker": SiDocker,
  "lucide:network": Network, "lucide:shield-check": ShieldCheck, "lucide:globe": Globe, "lucide:code": Code,
  "lucide:database": Database, "lucide:server": Server, "lucide:terminal": Terminal, "lucide:award": Award,
  "lucide:github": Github, "lucide:linkedin": Linkedin, "lucide:instagram": Instagram, "lucide:facebook": Facebook,
  "lucide:youtube": Youtube, "lucide:mail": Mail,
  "brand:x": ({ size = 20, color, className }) => <svg viewBox="0 0 24 24" width={size} height={size} fill={color || "currentColor"} className={className} aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
};
