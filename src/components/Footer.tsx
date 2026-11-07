import { motion } from 'framer-motion';
import { Github, Linkedin, Instagram, Facebook } from 'lucide-react';

// Custom X (Twitter) icon since lucide-react doesn't have the new X logo
const XIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const socialLinks = [
  { icon: Instagram, href: 'https://www.instagram.com/0mohammadardi0/', label: 'Instagram' },
  { icon: Facebook, href: 'https://www.facebook.com/miftahulislamardi', label: 'Facebook' },
  { icon: XIcon, href: 'https://x.com/AforArdi', label: 'X' },
  { icon: Linkedin, href: 'https://www.linkedin.com/in/mohammad-ardi/', label: 'LinkedIn' },
  { icon: Github, href: 'https://github.com/AforArdi', label: 'GitHub' },
];

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/50 py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          {/* Logo & info */}
          <div className="flex flex-col md:flex-row items-center gap-4">
            <motion.a
              href="#home"
              className="flex items-center gap-2 text-foreground font-mono text-xl font-bold"
              whileHover={{ scale: 1.05 }}
            >
              <span className="text-primary">&lt;</span>
              Ardi
              <span className="text-primary">/&gt;</span>
            </motion.a>
            
            <span className="hidden md:block text-muted-foreground">|</span>
            
            <span className="text-muted-foreground text-sm">
              Full Stack Developer
            </span>
          </div>

          {/* Social links */}
          <div className="flex flex-col items-center gap-4">
            <span className="text-sm font-mono text-muted-foreground">Media</span>
            <div className="flex gap-4">
              {socialLinks.map((link) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors duration-200"
                  aria-label={link.label}
                  whileHover={{ scale: 1.2, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <link.icon size={20} />
                </motion.a>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 pt-8 border-t border-border/30 text-center"
        >
          <p className="text-muted-foreground text-sm font-mono">
            © Copyright {currentYear}. Made by{' '}
            <span className="text-primary">Ardi</span>
          </p>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
