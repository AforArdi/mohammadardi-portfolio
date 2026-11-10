import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { PublicPortfolio } from "@/lib/content/public";
import Reveal from "./Reveal";
import ResumeDialog from "./ResumeDialog";
export default function HeroSection({ profile }: { profile: PublicPortfolio["profile"] }) {
  return (
    <section id="home" className="min-h-[100svh] flex items-center pt-28 pb-16 lg:pt-24 relative overflow-hidden">
      <div aria-hidden="true" className="absolute top-24 right-10 w-48 h-48 dot-pattern opacity-30 hidden lg:block" />
      <div aria-hidden="true" className="absolute bottom-20 left-1/4 w-32 h-32 dot-pattern opacity-20 hidden lg:block" />
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <Reveal className="order-2 lg:order-1">
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-bold font-mono leading-tight mb-4">{profile.greeting} <span className="text-primary glow-text">{profile.displayName}</span></h1>
            <p className="text-lg sm:text-xl xl:text-2xl font-mono text-muted-foreground mb-6 leading-relaxed">{profile.tagline.split("|").map((part, index) => <span key={index} className={index === 0 ? "text-primary" : "text-foreground/80"}>{index > 0 && " | "}{part.trim()}</span>)}</p>
            <div className="flex flex-wrap gap-4">
              <a href="#contact" className="btn-primary inline-flex items-center gap-2">Contact Me<ArrowRight size={18} aria-hidden="true" /></a>
              {profile.hasResume && <ResumeDialog />}
            </div>
            <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 border border-border/50 rounded-lg">
              <span className="w-2 h-2 shrink-0 rounded-full bg-green-500" aria-hidden="true" />
              <span className="text-xs sm:text-sm text-muted-foreground font-mono">{profile.availabilityText}</span>
            </div>
          </Reveal>
          <div className="order-1 lg:order-2 flex justify-center lg:justify-center relative">
            <div className="relative">
              <div aria-hidden="true" className="absolute inset-2 border-2 border-primary/40 -rotate-12 -translate-x-8" />
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 xl:w-80 xl:h-80 rounded-full overflow-hidden glow-avatar animate-float">
                {profile.avatarUrl ? <Image src={profile.avatarUrl} alt={profile.fullName} width={640} height={640} unoptimized priority sizes="(min-width: 1280px) 320px, (min-width: 640px) 256px, 224px" className="w-full h-full object-cover scale-[1.06]" /> : <span className="w-full h-full grid place-items-center font-mono text-8xl text-primary bg-card">{profile.displayName.slice(0, 1)}</span>}
              </div>
              <div aria-hidden="true" className="absolute -right-4 top-1/4 w-16 h-20 dot-pattern opacity-40" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
