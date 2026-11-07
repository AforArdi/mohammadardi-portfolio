import { motion } from 'framer-motion';
import { Github, Linkedin, Instagram, Facebook } from 'lucide-react';

const XIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
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

const FloatingSidebar = () => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.8 }}
      className="floating-sidebar hidden lg:flex"
    >
      {socialLinks.map((link, index) => (
        <motion.a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="social-icon"
          aria-label={link.label}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.9 + index * 0.1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <link.icon size={20} />
        </motion.a>
      ))}
    </motion.div>
  );
};

export default FloatingSidebar;
