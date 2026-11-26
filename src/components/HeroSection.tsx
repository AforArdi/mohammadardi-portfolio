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
              <span className="w-2 h-2 shrink-0 rounded-full bg-success dark:bg-green-500" aria-hidden="true" />
              <span className="text-xs sm:text-sm text-muted-foreground font-mono">{profile.availabilityText}</span>
            </div>
          </Reveal>
          <div className="order-1 flex justify-center lg:order-2">
            <figure className="portrait-width relative isolate max-w-full">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 translate-x-2.5 translate-y-2.5 rounded-[1.4rem] border border-primary/40" />
              <div className="glow-avatar relative aspect-[4/5] overflow-hidden rounded-[1.4rem] border border-primary/25 bg-card">
                {profile.avatarUrl ? (
                  <Image
                    src={profile.avatarUrl}
                    alt={profile.fullName}
                    fill
                    unoptimized
                    priority
                    sizes="(min-width: 1280px) 320px, (min-width: 640px) 256px, 224px"
                    className="object-cover"
                  />
                ) : (
                  <span aria-hidden="true" className="grid h-full place-items-center font-mono text-8xl text-primary">{profile.displayName.slice(0, 1)}</span>
                )}
              </div>
              <figcaption className="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-md border border-border bg-background/95 px-2.5 py-2 font-mono text-xs shadow-sm sm:px-3">
                <span className="min-w-0 truncate font-semibold text-foreground">{profile.displayName}</span>
                <span aria-hidden="true" className="text-primary">·</span>
                <span className="shrink-0 text-muted-foreground">Bangladesh</span>
                <svg aria-hidden="true" viewBox="0 0 20 12" width="20" height="12" className="shrink-0 rounded-[2px]">
                  <rect width="20" height="12" fill="#006A4E" />
                  <circle cx="9" cy="6" r="4" fill="#F42A41" />
                </svg>
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
