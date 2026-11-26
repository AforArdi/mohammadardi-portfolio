import SocialLinks from "./SocialLinks";

export default function FloatingSidebar() {
  return (
    <nav
      aria-label="Social profiles"
      className="floating-sidebar fixed left-4 top-1/2 z-30 hidden max-h-[calc(100dvh-10rem)] -translate-y-1/2 flex-col gap-3 overflow-y-auto overscroll-contain p-2 xl:flex"
    >
      <SocialLinks />
    </nav>
  );
}
