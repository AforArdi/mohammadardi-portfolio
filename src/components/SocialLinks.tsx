import { Github, Linkedin, Instagram, Facebook } from "lucide-react";

function XIcon({ size = 20 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>;
}

const socialLinks = [
  { icon: Instagram, href: "https://www.instagram.com/0mohammadardi0/", label: "Instagram" },
  { icon: Facebook, href: "https://www.facebook.com/miftahulislamardi", label: "Facebook" },
  { icon: XIcon, href: "https://x.com/AforArdi", label: "X" },
  { icon: Linkedin, href: "https://www.linkedin.com/in/mohammad-ardi/", label: "LinkedIn" },
  { icon: Github, href: "https://github.com/AforArdi", label: "GitHub" },
];

export default function SocialLinks() {
  return socialLinks.map(({ icon: Icon, href, label }) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="social-icon" aria-label={label}><Icon size={20} aria-hidden="true" /></a>);
}
