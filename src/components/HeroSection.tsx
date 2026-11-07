import { motion } from 'framer-motion';
import { ArrowRight, Download } from 'lucide-react';
import heroAvatar from '@/assets/new-hero-avatar.png';
import { getLenis } from './SmoothScroll';

const HeroSection = () => {
  const handleContactClick = () => {
    const lenis = getLenis();
    if (lenis) {
      lenis.scrollTo('#contact');
    } else {
      const element = document.getElementById('contact');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <section id="home" className="min-h-screen flex items-center pt-20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-20 right-10 w-48 h-48 dot-pattern opacity-30 hidden lg:block" />
      <div className="absolute bottom-20 left-1/4 w-32 h-32 dot-pattern opacity-20 hidden lg:block" />
      
      {/* Geometric accent */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.3, scale: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="absolute top-1/3 right-1/4 w-40 h-40 border-2 border-primary/30 hidden lg:block"
        style={{ transform: 'rotate(45deg)' }}
      />

      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-1"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold font-mono leading-tight mb-4"
            >
              Hi, I'm{' '}
              <span className="text-primary glow-text">Ardi</span>
            </motion.h1>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="text-xl md:text-2xl font-mono text-muted-foreground mb-6"
            >
              <span className="text-primary">Building</span>{' '}
              <span className="text-foreground/80">| Debugging | Improving</span>
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.65 }}
              className="flex flex-wrap gap-4"
            >
              <motion.button
                onClick={handleContactClick}
                className="btn-primary flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Contact Me
                <ArrowRight size={18} />
              </motion.button>
              <motion.a
                href="https://drive.google.com/file/d/1dbwWiOoUVsHxS-oyiVwn8ztcdXrvpaNA/view?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Download My CV
                <Download size={18} />
              </motion.a>
            </motion.div>

            {/* Status badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-10 inline-flex items-center gap-2 px-4 py-2 border border-border/50 rounded-lg"
            >
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-muted-foreground font-mono">
                Open for new opportunities
              </span>
            </motion.div>
          </motion.div>

          {/* Avatar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="order-1 lg:order-2 flex justify-center lg:justify-end relative"
          >
            {/* Geometric frame behind avatar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-primary/40"
              style={{ transform: 'translate(-40%, -50%) rotate(-10deg)' }}
            />
            
            <div className="relative">
              <motion.div
                className="w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden glow-avatar animate-glow-pulse"
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <img
                  src={heroAvatar}
                  alt="Ardi - Full Stack Developer"
                  className="w-full h-full object-cover"
                />
              </motion.div>
              
              {/* Decorative dots */}
              <div className="absolute -right-8 top-1/4 w-20 h-20 dot-pattern opacity-40" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
