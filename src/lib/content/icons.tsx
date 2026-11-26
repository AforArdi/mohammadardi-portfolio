import type { ComponentType } from "react";
import {
  SiHtml5, SiCss, SiTailwindcss, SiJavascript, SiTypescript, SiReact, SiNextdotjs,
  SiExpress, SiMongodb, SiJsonwebtokens, SiNodedotjs, SiPython, SiGit, SiGithub,
  SiPostgresql, SiSupabase, SiDocker, SiWhatsapp, SiTelegram, SiDiscord, SiReddit,
  SiTiktok, SiTwitch, SiBluesky, SiThreads, SiPinterest, SiStackoverflow,
} from "react-icons/si";
import {
  Network, ShieldCheck, Globe, Code, Database, Server, Terminal, Award,
  Github, Linkedin, Instagram, Facebook, Youtube, Mail,
} from "lucide-react";

type IconComponent = ComponentType<{ size?: number; color?: string; className?: string; "aria-hidden"?: boolean }>;
type CatalogIcon = { key: string; label: string; Icon: IconComponent; aliases?: string };

// Explicit imports keep the public bundle small. Library icons never need a network API or Storage object.
export const iconCatalog: readonly CatalogIcon[] = [
  { key: "simple-icons:html5", label: "HTML5", Icon: SiHtml5 },
  { key: "simple-icons:css", label: "CSS", Icon: SiCss, aliases: "css3" },
  { key: "simple-icons:tailwindcss", label: "Tailwind CSS", Icon: SiTailwindcss },
  { key: "simple-icons:javascript", label: "JavaScript", Icon: SiJavascript, aliases: "js" },
  { key: "simple-icons:typescript", label: "TypeScript", Icon: SiTypescript, aliases: "ts" },
  { key: "simple-icons:react", label: "React", Icon: SiReact, aliases: "reactjs" },
  { key: "simple-icons:nextdotjs", label: "Next.js", Icon: SiNextdotjs },
  { key: "simple-icons:express", label: "Express", Icon: SiExpress, aliases: "expressjs" },
  { key: "simple-icons:mongodb", label: "MongoDB", Icon: SiMongodb },
  { key: "simple-icons:jsonwebtokens", label: "JSON Web Tokens", Icon: SiJsonwebtokens, aliases: "jwt security" },
  { key: "simple-icons:nodedotjs", label: "Node.js", Icon: SiNodedotjs },
  { key: "simple-icons:python", label: "Python", Icon: SiPython },
  { key: "simple-icons:git", label: "Git", Icon: SiGit },
  { key: "simple-icons:github", label: "GitHub (brand)", Icon: SiGithub },
  { key: "simple-icons:postgresql", label: "PostgreSQL", Icon: SiPostgresql, aliases: "postgres" },
  { key: "simple-icons:supabase", label: "Supabase", Icon: SiSupabase },
  { key: "simple-icons:docker", label: "Docker", Icon: SiDocker },
  { key: "simple-icons:whatsapp", label: "WhatsApp", Icon: SiWhatsapp, aliases: "whats app wa" },
  { key: "simple-icons:telegram", label: "Telegram", Icon: SiTelegram, aliases: "tg" },
  { key: "simple-icons:discord", label: "Discord", Icon: SiDiscord },
  { key: "simple-icons:reddit", label: "Reddit", Icon: SiReddit },
  { key: "simple-icons:tiktok", label: "TikTok", Icon: SiTiktok },
  { key: "simple-icons:twitch", label: "Twitch", Icon: SiTwitch },
  { key: "simple-icons:bluesky", label: "Bluesky", Icon: SiBluesky, aliases: "bsky" },
  { key: "simple-icons:threads", label: "Threads", Icon: SiThreads },
  { key: "simple-icons:pinterest", label: "Pinterest", Icon: SiPinterest },
  { key: "simple-icons:stackoverflow", label: "Stack Overflow", Icon: SiStackoverflow },
  { key: "lucide:network", label: "Network", Icon: Network, aliases: "rest api" },
  { key: "lucide:shield-check", label: "Shield check", Icon: ShieldCheck, aliases: "security betterauth" },
  { key: "lucide:globe", label: "Globe", Icon: Globe, aliases: "website web link" },
  { key: "lucide:code", label: "Code", Icon: Code },
  { key: "lucide:database", label: "Database", Icon: Database },
  { key: "lucide:server", label: "Server", Icon: Server },
  { key: "lucide:terminal", label: "Terminal", Icon: Terminal },
  { key: "lucide:award", label: "Award", Icon: Award },
  { key: "lucide:github", label: "GitHub", Icon: Github },
  { key: "lucide:linkedin", label: "LinkedIn", Icon: Linkedin },
  { key: "lucide:instagram", label: "Instagram", Icon: Instagram, aliases: "insta" },
  { key: "lucide:facebook", label: "Facebook", Icon: Facebook, aliases: "fb" },
  { key: "lucide:youtube", label: "YouTube", Icon: Youtube, aliases: "yt" },
  { key: "lucide:mail", label: "Email", Icon: Mail, aliases: "e-mail contact" },
  {
    key: "brand:x", label: "X / Twitter", aliases: "twitter", Icon: ({ size = 20, color, className }) => (
      <svg viewBox="0 0 24 24" width={size} height={size} fill={color || "currentColor"} className={className} aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
];

// Used for both server-side allowlist validation and public rendering. Existing saved keys stay stable.
export const iconRegistry: Record<string, IconComponent> = Object.fromEntries(iconCatalog.map(({ key, Icon }) => [key, Icon]));

const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

export function searchIcons(query: string, allowBrand = true) {
  const search = normalize(query);
  return iconCatalog.filter(icon =>
    (allowBrand || !icon.key.startsWith("brand:")) &&
    normalize(`${icon.label} ${icon.key} ${icon.aliases || ""}`).includes(search)
  );
}
