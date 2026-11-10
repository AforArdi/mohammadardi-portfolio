"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "./ui/sheet";

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
    <header className={`public-header fixed inset-x-0 top-0 z-40 transition-all duration-300 ${scrolled ? "glass py-4" : "bg-background/90 py-6"}`}>
      <nav aria-label="Main navigation" className="container mx-auto px-6 public-nav relative">
        <div className="flex items-center justify-between lg:grid lg:grid-cols-2 lg:gap-8 w-full min-h-[2rem]">
          {/* Column 1: Logo (aligned with "Hi" at lg+) + Mobile hamburger button (< lg) */}
          <div className="flex items-center justify-between lg:justify-start w-full lg:w-auto">
            <a href="#home" aria-label={`${displayName}, home`} className="flex min-w-0 max-w-48 items-center gap-2 font-mono text-xl font-bold">
              <span className="text-primary">&lt;</span><span className="truncate">{displayName}</span><span className="text-primary">/&gt;</span>
            </a>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button type="button" className="lg:hidden p-2" aria-label="Open navigation">
                  <Menu size={24} />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(85vw,360px)]">
                <SheetTitle className="font-mono text-primary">Navigation</SheetTitle>
                <SheetDescription className="sr-only">Jump to a section of Ardi’s portfolio.</SheetDescription>
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

          {/* Column 2 (lg+): Shared layout constraints with HeroSection to align nav right edge with portrait avatar */}
          <div className="hidden lg:flex justify-center relative">
            <div className="relative w-56 sm:w-64 xl:w-80 flex justify-end">
              <ul className="desktop-nav-links flex items-center gap-6 whitespace-nowrap absolute right-0 top-1/2 -translate-y-1/2">
                {sections.map(id => (
                  <li key={id}>
                    <a href={`#${id}`} aria-current={active === id ? "location" : undefined} className={`nav-link font-mono text-sm whitespace-nowrap ${active === id ? "active" : ""}`}>
                      {id}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
