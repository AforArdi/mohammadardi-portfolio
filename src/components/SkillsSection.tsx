import { motion, useInView } from 'motion/react';
import { useRef } from 'react';
import {
  SiHtml5,
  SiCss,
  SiTailwindcss,
  SiJavascript,
  SiReact,
  SiNextdotjs,
  SiExpress,
  SiMongodb,
  SiJsonwebtokens,
} from 'react-icons/si';
import { Network, ShieldCheck } from 'lucide-react';
import type { IconType } from 'react-icons';

type Skill = {
  name: string;
  icon: IconType | typeof Network;
  color: string;
};

const skills: Skill[] = [
  { name: 'HTML', icon: SiHtml5, color: '#E34F26' },
  { name: 'CSS', icon: SiCss, color: '#1572B6' },
  { name: 'Tailwind CSS', icon: SiTailwindcss, color: '#38BDF8' },
  { name: 'JavaScript (ES6+)', icon: SiJavascript, color: '#F7DF1E' },
  { name: 'React', icon: SiReact, color: '#61DAFB' },
  { name: 'Next.js', icon: SiNextdotjs, color: '#FFFFFF' },
  { name: 'Express.js', icon: SiExpress, color: '#FFFFFF' },
  { name: 'REST APIs', icon: Network, color: '#A78BFA' },
  { name: 'MongoDB', icon: SiMongodb, color: '#47A248' },
  { name: 'BetterAuth', icon: ShieldCheck, color: '#C084FC' },
  { name: 'JWT Security', icon: SiJsonwebtokens, color: '#D946EF' },
];

const SkillsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="skills" className="py-24 relative" ref={ref}>
      {/* Background decoration */}
      <div className="absolute top-1/4 left-10 w-32 h-32 dot-pattern opacity-20 hidden lg:block" />
      
      {/* Geometric accent */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 0.2 } : {}}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="absolute top-1/3 left-1/4 hidden lg:block"
      >
        <div className="w-24 h-24 border-2 border-primary/40" style={{ transform: 'rotate(45deg)' }} />
        <div className="w-16 h-16 border-2 border-primary/30 -mt-8 ml-8" style={{ transform: 'rotate(45deg)' }} />
      </motion.div>

      <div className="container mx-auto px-6">
        {/* Section title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-4 mb-16"
        >
          <h2 className="section-title">skills</h2>
          <div className="section-line" />
        </motion.div>

        {/* Skills grid */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.07 } },
          }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5 max-w-5xl mx-auto"
        >
          {skills.map((skill) => {
            const Icon = skill.icon;
            return (
              <motion.div
                key={skill.name}
                variants={{
                  hidden: { opacity: 0, y: 24, scale: 0.9 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { type: 'spring', stiffness: 220, damping: 18 },
                  },
                }}
                whileHover={{
                  y: -6,
                  scale: 1.04,
                  transition: { type: 'spring', stiffness: 300, damping: 14 },
                }}
                className="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl
                           border border-border/60 bg-card/40 backdrop-blur-sm
                           transition-all duration-300
                           hover:border-primary/50 hover:bg-card/70
                           hover:shadow-[0_0_30px_hsl(var(--primary)/0.18)]"
              >
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, ${skill.color}22, transparent 70%)`,
                  }}
                />
                <Icon
                  size={40}
                  color={skill.color}
                  className="drop-shadow-[0_0_10px_rgba(255,255,255,0.05)] transition-transform duration-300 group-hover:scale-110"
                />
                <span className="font-mono text-xs sm:text-sm text-muted-foreground text-center group-hover:text-foreground transition-colors">
                  {skill.name}
                </span>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Additional decorative elements */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-16 flex justify-center"
        >
          <div className="flex items-center gap-4">
            <div className="w-24 h-px bg-gradient-to-r from-transparent to-primary/50" />
            <span className="text-primary font-mono text-sm">always learning</span>
            <div className="w-24 h-px bg-gradient-to-l from-transparent to-primary/50" />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SkillsSection;
