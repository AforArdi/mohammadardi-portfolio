import Image from 'next/image';
import SectionHeading from './SectionHeading';
import Reveal from './Reveal';
import { ExternalLink } from 'lucide-react';

const achievements = [
  {
    title: "CS50's Introduction to Computer Science",
    subtitle: "Certificate of Completion",
    description: "Harvard's CS50 is a beginner-friendly introduction to computer science that prioritizes problem-solving and computational thinking over just learning syntax. Designed for students with no prior experience, the course starts with C to teach low-level fundamentals (like memory management) before transitioning to Python, SQL, and web technologies (HTML, CSS, JavaScript). The curriculum focuses on teaching you how to learn new languages effectively and culminates in a final project.",
    imageUrl: "https://certificates.cs50.io/009a021f-dd2c-40fc-8f4c-77b9e511e992.png?size=A4",
    verifyUrl: "https://cs50.harvard.edu/certificates/009a021f-dd2c-40fc-8f4c-77b9e511e992"
  },
  {
    title: "Workshop on Computer Programming & Robotics",
    subtitle: "Certificate of Participation",
    description: "Experts from a well-known engineering university collaborated with American Corner Khulna to provide a hands-on experience in robotics and computer programming. The workshop focused on understanding how robotics systems work at a low level and how the C programming language can directly manipulate hardware components.",
    imageUrl: "https://raw.githubusercontent.com/AforArdi/mohammadardi/refs/heads/main/images/ROBOTICS.png",
    verifyUrl: "https://raw.githubusercontent.com/AforArdi/mohammadardi/refs/heads/main/images/ROBOTICS.png"
  }
];

const AchievementsSection = () => {
  return (
    <section id="achievements" className="py-20 md:py-24 relative">
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-32 h-32 border border-primary/10 rounded-full" />
      <div className="absolute bottom-20 right-10 w-24 h-24 border border-primary/20 rotate-45" />

      <div className="container mx-auto px-6">
        {/* Section title */}
        <SectionHeading>achievements</SectionHeading>

        {/* Achievements grid */}
        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {achievements.map((achievement) => (
            <Reveal
              key={achievement.title}
              className="achievement-card group border border-border/60 bg-card/40 backdrop-blur-sm rounded-lg overflow-hidden 
                         transition-all duration-300 hover:border-primary/50 
                         hover:shadow-[0_0_30px_hsl(var(--primary)/0.15)]"
            >
              {/* Certificate Image */}
              <div className="relative aspect-[1.414/1] overflow-hidden bg-white">
                <Image
                  src={achievement.imageUrl}
                  alt={achievement.title}
                  fill
                  sizes="(min-width: 1440px) 496px, (min-width: 1024px) 44vw, (min-width: 768px) 720px, calc(100vw - 48px)"
                  className="object-contain"
                />
              </div>
              
              {/* Card Content */}
              <div className="p-6">
                <h3 className="font-mono font-bold text-lg text-foreground">
                  {achievement.title}
                </h3>
                <p className="text-primary text-sm font-mono mt-1">
                  {achievement.subtitle}
                </p>
                <p className="text-muted-foreground text-sm mt-4 leading-relaxed">
                  {achievement.description}
                </p>
                
                {/* View Certificate Button */}
                <a
                  href={achievement.verifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-6 px-4 py-2 
                             bg-primary/10 border border-primary/30 rounded-md
                             text-primary font-mono text-sm
                             transition-all duration-300
                             hover:bg-primary/20 hover:border-primary/50
                             hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
                >
                  <ExternalLink size={16} />
                  View Certificate
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AchievementsSection;
