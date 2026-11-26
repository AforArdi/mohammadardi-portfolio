import { getPublicPortfolio } from "@/lib/content/public";
import PortfolioIcon from "./PortfolioIcon";

export default async function SocialLinks() {
  const { socials } = await getPublicPortfolio();
  return socials.map(social => {
    return <a key={social.id} href={social.href} target="_blank" rel="noopener noreferrer" className="social-icon" aria-label={social.label}><PortfolioIcon iconKey={social.iconKey} customIconUrl={social.customIconUrl} size={20} /></a>;
  });
}
