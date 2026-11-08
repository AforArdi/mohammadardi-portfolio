import Image from "next/image";
import { ArrowRight, Download } from "lucide-react";
import heroAvatar from "@/assets/new-hero-avatar.png";
export default function HeroSection() {
  return (
    <section id="home" className="min-h-[100svh] flex items-center pt-28 pb-16 lg:pt-24 relative overflow-hidden">
      <div aria-hidden="true" className="absolute top-24 right-10 w-48 h-48 dot-pattern opacity-30 hidden lg:block" />
      <div aria-hidden="true" className="absolute bottom-20 left-1/4 w-32 h-32 dot-pattern opacity-20 hidden lg:block" />
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div className="order-2 lg:order-1">
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-bold font-mono leading-tight mb-4">Hi, I&apos;m <span className="text-primary glow-text">Ardi</span></h1>
            <p className="text-lg sm:text-xl xl:text-2xl font-mono text-muted-foreground mb-6 leading-relaxed"><span className="text-primary">Building</span><span className="text-foreground/80"> | Debugging | Improving</span></p>
            <div className="flex flex-wrap gap-4">
              <a href="#contact" className="btn-primary inline-flex items-center gap-2">Contact Me<ArrowRight size={18} aria-hidden="true" /></a>
              <a href="https://drive.google.com/file/d/1dbwWiOoUVsHxS-oyiVwn8ztcdXrvpaNA/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-2">Download My CV<Download size={18} aria-hidden="true" /></a>
            </div>
            <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 border border-border/50 rounded-lg">
              <span className="w-2 h-2 shrink-0 rounded-full bg-green-500" aria-hidden="true" />
              <span className="text-xs sm:text-sm text-muted-foreground font-mono">Open for new opportunities</span>
            </div>
          </div>
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end relative lg:pr-4">
            <div className="relative">
              <div aria-hidden="true" className="absolute inset-2 border-2 border-primary/40 -rotate-12 -translate-x-8" />
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 xl:w-80 xl:h-80 rounded-full overflow-hidden glow-avatar animate-float">
                <Image src={heroAvatar} alt="Md Miftahul Islam Ardi" priority sizes="(min-width: 1280px) 320px, (min-width: 640px) 256px, 224px" className="w-full h-full object-cover" />
              </div>
              <div aria-hidden="true" className="absolute -right-4 top-1/4 w-16 h-20 dot-pattern opacity-40" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
