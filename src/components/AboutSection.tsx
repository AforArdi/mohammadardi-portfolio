import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";
import type { PublicPortfolio } from "@/lib/content/public";
export default function AboutSection({ profile }: { profile: PublicPortfolio["profile"] }) {
  return (
    <section id="about" className="py-20 md:py-24 relative">
      <div className="container mx-auto px-6">
        <SectionHeading>{profile.aboutHeading}</SectionHeading>
        <Reveal className="max-w-3xl mx-auto">
          <h3 className="text-2xl font-mono font-bold text-primary mb-4">{profile.fullName}</h3>
          <p className="text-muted-foreground text-lg leading-relaxed whitespace-pre-line">{profile.aboutBio}</p>
        </Reveal>
      </div>
    </section>
  );
}
