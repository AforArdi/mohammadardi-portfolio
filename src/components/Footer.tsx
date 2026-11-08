import SocialLinks from "./SocialLinks";
export default function Footer() {
  return (
    <footer className="border-t border-border/50 py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <a href="#home" className="flex items-center gap-2 text-foreground font-mono text-xl font-bold"><span className="text-primary">&lt;</span>Ardi<span className="text-primary">/&gt;</span></a>
            <span className="hidden md:block text-muted-foreground" aria-hidden="true">|</span><span className="text-muted-foreground text-sm">Full Stack Developer</span>
          </div>
          <nav aria-label="Footer social profiles" className="flex flex-col items-center gap-4"><span className="text-sm font-mono text-muted-foreground">Media</span><div className="flex gap-3"><SocialLinks /></div></nav>
        </div>
        <div className="mt-8 pt-8 border-t border-border/30 text-center"><p className="text-muted-foreground text-sm font-mono">© Copyright {new Date().getFullYear()}. Made by <span className="text-primary">Ardi</span></p></div>
      </div>
    </footer>
  );
}
