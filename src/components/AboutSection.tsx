import { motion, useInView } from 'framer-motion';
import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const AboutSection = () => {
  const ref = useRef(null);
  const textRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        if (textRef.current) {
          gsap.fromTo(
            textRef.current,
            { y: 40, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: ref.current,
                start: 'top 75%',
                end: 'top 30%',
                scrub: 1,
              },
            }
          );
        }
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section id="about" className="py-24 relative" ref={ref}>
      <div className="container mx-auto px-6">
        {/* Section title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-4 mb-16"
        >
          <h2 className="section-title">about-me</h2>
          <div className="section-line" />
        </motion.div>

        <div className="max-w-3xl mx-auto">
          {/* Text content */}
          <div ref={textRef}>
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-2xl font-mono font-bold text-primary mb-4"
            >
              Md Miftahul Islam Ardi
            </motion.h3>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-muted-foreground text-lg leading-relaxed"
            >
              An entry-level web developer passionate about building modern full-stack 
              applications. Skilled at solving technical challenges with quick research, 
              AI-supported debugging, and hands-on project work, all while eagerly 
              improving both frontend and backend abilities.
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
