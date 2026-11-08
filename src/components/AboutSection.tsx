import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";
export default function AboutSection() {
  return (
    <section id="about" className="py-20 md:py-24 relative">
      <div className="container mx-auto px-6">
        <SectionHeading>about-me</SectionHeading>
        <Reveal className="max-w-3xl mx-auto">
          <h3 className="text-2xl font-mono font-bold text-primary mb-4">Md Miftahul Islam Ardi</h3>
          <p className="text-muted-foreground text-lg leading-relaxed">An entry-level web developer passionate about building modern full-stack applications. Skilled at solving technical challenges with quick research, AI-supported debugging, and hands-on project work, all while eagerly improving both frontend and backend abilities.</p>
        </Reveal>
      </div>
    </section>
  );
}
