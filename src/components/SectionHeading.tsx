export default function SectionHeading({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-4 mb-12 sm:mb-16"><h2 className="section-title">{children}</h2><div className="section-line" aria-hidden="true" /></div>;
}
