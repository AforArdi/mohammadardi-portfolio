import SocialLinks from "./SocialLinks";
import Reveal from "./Reveal";
export default function Footer({ displayName = "Ardi" }: { displayName?: string }) {
  return (
    <footer className="border-t border-border/50 py-12">
      <Reveal className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-8">
          <div className="flex flex-col md:flex-row items-center gap-4 justify-self-center lg:justify-self-start">
            <a href="#home" className="flex min-w-0 max-w-64 items-center gap-2 text-foreground font-mono text-xl font-bold"><span className="text-primary">&lt;</span><span className="truncate">{displayName}</span><span className="text-primary">/&gt;</span></a>
            <span className="hidden md:block text-muted-foreground" aria-hidden="true">|</span><span className="text-muted-foreground text-sm">Full Stack Developer</span>
          </div>
        <div className="text-center justify-self-center md:max-w-60"><p className="text-muted-foreground text-sm font-mono">© Copyright {new Date().getFullYear()}. Made by <span className="text-primary break-words">{displayName}</span></p></div>
          <nav aria-label="Footer social profiles" className="flex flex-col items-center gap-4 justify-self-center lg:justify-self-end"><span className="text-sm font-mono text-muted-foreground">Media</span><div className="flex flex-wrap justify-center gap-3"><SocialLinks /></div></nav>
        </div>

      </Reveal>
    </footer>
  );
}
