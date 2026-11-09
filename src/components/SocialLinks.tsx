import { getPublicPortfolio } from "@/lib/content/public";
import { iconRegistry } from "@/lib/content/icons";

export default async function SocialLinks() {
  const { socials } = await getPublicPortfolio();
  return socials.map(social => {
    const Icon = iconRegistry[social.iconKey] || iconRegistry["lucide:globe"];
    return <a key={social.id} href={social.href} target="_blank" rel="noopener noreferrer" className="social-icon" aria-label={social.label}><Icon size={20} aria-hidden /></a>;
  });
}
