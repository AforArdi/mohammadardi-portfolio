import { motion, useInView } from 'framer-motion';
import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ExternalLink, Github } from 'lucide-react';
import heroRideImage from '@/assets/heroride.png';

const projects = [
  {
    name: 'Qurbani Hat',
    about:
      'An online platform for booking qurbani animals with an intuitive interface for browsing, comparing, and booking animals for Eid celebrations.',
    image: 'https://i.postimg.cc/bJVXx1c3/qurbani-hat.png',
    github: 'https://github.com/AforArdi/qurbani-hat-a8',
    live: 'https://qurbani-hat-a8.vercel.app',
  },
  {
    name: 'Dragon News',
    about:
      'A modern, responsive news portal application built with Next.js and React 19. Browse news articles by category, authenticate users securely, and enjoy a seamless reading experience.',
    image: 'https://i.postimg.cc/DZpVr1kg/dragon-news.png',
    github: 'https://github.com/AforArdi/dragon-news-nextjs',
    live: 'https://dragon-news-nextjs-navy.vercel.app/',
  },
  {
    name: 'HeroRide',
    about:
      "Hey there! Welcome to HeroRide. I built this full-stack web application as a major milestone in my 180-day MERN stack learning journey. I'm super excited to share it because building this platform really pushed my skills to the next level in connecting a Next.js frontend with a secure Express backend!",
    image: heroRideImage,
    github: 'https://github.com/AforArdi/heroride',
    githubServer: 'https://github.com/AforArdi/heroride-server',
    live: 'https://heroride.vercel.app',
  },
];

const ProjectsSection = () => {
  const ref = useRef(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const cards = gridRef.current?.querySelectorAll('.project-card');
        if (!cards || cards.length === 0) return;
        gsap.set(cards, { opacity: 0, scale: 0.95 });
        ScrollTrigger.batch(cards as NodeListOf<Element>, {
          start: 'top 85%',
          onEnter: (batch) =>
            gsap.to(batch, {
              opacity: 1,
              scale: 1,
              duration: 0.6,
              ease: 'power2.out',
              stagger: 0.1,
              overwrite: true,
            }),
        });
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section id="projects" className="py-24 relative" ref={ref}>
      <div className="absolute top-20 right-10 w-32 h-32 border border-primary/10 rounded-full" />
      <div className="absolute bottom-20 left-10 w-24 h-24 border border-primary/20 rotate-45" />

      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-4 mb-16"
        >
          <h2 className="section-title">projects</h2>
          <div className="section-line" />
        </motion.div>

        <div ref={gridRef} className="grid md:grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {projects.map((project, index) => (
            <div
              key={project.name}
              className="project-card group border border-border/60 bg-card/40 backdrop-blur-sm rounded-lg overflow-hidden 
                         transition-all duration-300 hover:border-primary/50 
                         hover:shadow-[0_0_30px_hsl(var(--primary)/0.15)] flex flex-col"
            >
              <div className="overflow-hidden bg-background/50">
                <img
                  src={project.image}
                  alt={project.name}
                  loading="lazy"
                  className="w-full transition-all duration-300 group-hover:scale-105"
                />
              </div>

              <div className="p-6 flex flex-col flex-1">
                <h3 className="font-mono font-bold text-lg text-foreground">
                  {project.name}
                </h3>
                <p className="text-muted-foreground text-sm mt-3 leading-relaxed flex-1">
                  {project.about}
                </p>

                <div className="flex flex-wrap gap-3 mt-6">
                  <a
                    href={project.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 
                               border border-border rounded-md
                               text-foreground font-mono text-sm
                               transition-all duration-300
                               hover:border-primary/50 hover:text-primary
                               hover:shadow-[0_0_20px_hsl(var(--primary)/0.2)]"
                  >
                    <Github size={16} />
                    {('githubServer' in project) ? 'Frontend' : 'GitHub'}
                  </a>
                  {('githubServer' in project) && (
                    <a
                      href={(project as { githubServer: string }).githubServer}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 
                                 border border-border rounded-md
                                 text-foreground font-mono text-sm
                                 transition-all duration-300
                                 hover:border-primary/50 hover:text-primary
                                 hover:shadow-[0_0_20px_hsl(var(--primary)/0.2)]"
                    >
                      <Github size={16} />
                      Backend
                    </a>
                  )}
                  <a
                    href={project.live}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 
                               bg-primary/10 border border-primary/30 rounded-md
                               text-primary font-mono text-sm
                               transition-all duration-300
                               hover:bg-primary/20 hover:border-primary/50
                               hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
                  >
                    <ExternalLink size={16} />
                    Live Demo
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectsSection;