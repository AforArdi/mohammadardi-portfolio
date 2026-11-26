"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "./ui/sheet";
import ThemeToggle from "./ThemeToggle";
import DhakaClock from "./DhakaClock";

const defaultSections = ["home", "about", "skills", "projects", "achievements", "contact"];

export default function Navbar({ sections = defaultSections, displayName = "Ardi" }: { sections?: string[]; displayName?: string }) {
  const [active, setActive] = useState("home");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      setScrolled(window.scrollY > 40);
      const current = [...sections].reverse().find(id => (document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= 160);
      if (current) setActive(current);
      frame = 0;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const onResize = () => { if (window.innerWidth >= 1024) setOpen(false); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize); cancelAnimationFrame(frame); };
  }, [sections]);

  return (
    <header className={`public-header fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${scrolled ? "glass" : "border border-transparent bg-background/90"}`}>
      <nav aria-label="Main navigation" className="container mx-auto px-6 public-nav relative">
        <div className="flex min-h-[4.75rem] w-full items-center justify-between lg:grid lg:grid-cols-2 lg:gap-8">
          {/* Column 1: Logo (aligned with "Hi" at lg+) + Mobile hamburger button (< lg) */}
          <div className="flex w-full min-w-0 items-center justify-between gap-3 lg:w-auto lg:justify-start">
            <div className="flex min-w-0 flex-col items-start gap-1">
              <a href="#home" aria-label={`${displayName}, home`} className="flex min-w-0 max-w-full items-center gap-2 font-mono text-xl font-bold transition-colors hover:text-primary lg:max-w-40 xl:max-w-48">
                <span className="text-primary">&lt;</span><span className="truncate">{displayName}</span><span className="text-primary">/&gt;</span>
              </a>
              <DhakaClock />
            </div>
            <div className="flex items-center gap-1 lg:hidden">
              <ThemeToggle />
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <button type="button" className="inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary" aria-label="Open navigation">
                    <Menu size={24} aria-hidden="true" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[min(85vw,360px)]">
                  <SheetTitle className="font-mono text-primary">Navigation</SheetTitle>
                  <SheetDescription className="sr-only">Jump to a section of the portfolio.</SheetDescription>
                  <nav aria-label="Mobile navigation" className="mt-10 flex flex-col gap-3">
                    {sections.map(id => (
                      <SheetClose key={id} asChild>
                        <a href={`#${id}`} aria-current={active === id ? "location" : undefined} className={`nav-link py-3 px-2 font-mono ${active === id ? "active" : ""}`}>
                          {id}
                        </a>
                      </SheetClose>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Column 2 (lg+): Shared layout constraints with HeroSection to align nav right edge with portrait avatar */}
          <div className="hidden lg:flex justify-center relative">
            <div className="portrait-width relative flex justify-end">
              <ul className="desktop-nav-links absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-5 whitespace-nowrap xl:gap-6">
                {sections.map(id => (
                  <li key={id}>
                    <a href={`#${id}`} aria-current={active === id ? "location" : undefined} className={`nav-link font-mono text-sm whitespace-nowrap ${active === id ? "active" : ""}`}>
                      {id}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="absolute left-full top-1/2 ml-3 -translate-y-1/2">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
