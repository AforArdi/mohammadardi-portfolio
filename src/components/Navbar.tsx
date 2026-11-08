"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "./ui/sheet";

const sections = ["home", "about", "skills", "projects", "achievements", "contact"];

export default function Navbar() {
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
    const onResize = () => { if (window.innerWidth >= 768) setOpen(false); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize); cancelAnimationFrame(frame); };
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${scrolled ? "glass py-4" : "bg-background/90 py-6"}`}>
      <nav aria-label="Main navigation" className="container mx-auto px-6 flex items-center justify-between gap-4">
        <a href="#home" aria-label="Ardi, home" className="flex items-center gap-2 font-mono text-xl font-bold"><span className="text-primary">&lt;</span>Ardi<span className="text-primary">/&gt;</span></a>
        <ul className="hidden md:flex items-center gap-4 lg:gap-7">
          {sections.map(id => <li key={id}><a href={`#${id}`} aria-current={active === id ? "location" : undefined} className={`nav-link font-mono text-sm ${active === id ? "active" : ""}`}>{id}</a></li>)}
        </ul>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild><button type="button" className="md:hidden p-2" aria-label="Open navigation"><Menu size={24} /></button></SheetTrigger>
          <SheetContent side="right" className="w-[min(85vw,360px)]">
            <SheetTitle className="font-mono text-primary">Navigation</SheetTitle>
            <SheetDescription className="sr-only">Jump to a section of Ardi’s portfolio.</SheetDescription>
            <nav aria-label="Mobile navigation" className="mt-10 flex flex-col gap-3">
              {sections.map(id => <SheetClose key={id} asChild><a href={`#${id}`} aria-current={active === id ? "location" : undefined} className={`nav-link py-3 px-2 font-mono ${active === id ? "active" : ""}`}>{id}</a></SheetClose>)}
            </nav>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
