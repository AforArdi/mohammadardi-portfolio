import type { PublicPortfolio } from "@/lib/content/public";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";
import { ExternalLink, Play } from "lucide-react";

export default function MyYtWeekSection({ videos }: { videos: PublicPortfolio["videos"] }) {
  if (!videos || videos.length === 0) return null;

  return (
    <section id="my-yt-week" className="py-20 md:py-24 relative">
      <div className="absolute top-20 left-10 w-32 h-32 border border-primary/10 rounded-full pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-24 h-24 border border-primary/20 rotate-45 pointer-events-none" />

      <div className="container mx-auto px-6">
        <SectionHeading>My YT Week</SectionHeading>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {videos.map(video => (
            <Reveal
              key={video.id}
              className="group flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card/40 backdrop-blur-sm transition duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_hsl(var(--primary)/0.15)] focus-within:border-primary/50"
            >
              <div className="relative aspect-video overflow-hidden bg-muted/40">
                {video.thumbnailUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-background text-muted-foreground">
                    <Play size={40} className="text-primary/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors pointer-events-none" />
                <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-2 py-1 rounded font-mono pointer-events-none flex items-center gap-1.5">
                  <Play size={10} className="fill-current" />
                  <span>YouTube</span>
                </div>
              </div>

              <div className="p-6 flex flex-col flex-1">
                <h3 className="font-mono font-bold text-lg text-foreground line-clamp-2">
                  {video.title}
                </h3>
                {video.description && (
                  <p className="text-muted-foreground text-sm mt-3 leading-relaxed flex-1 whitespace-pre-line line-clamp-4">
                    {video.description}
                  </p>
                )}
                {video.channelTitle && (
                  <p className="mt-3 font-mono text-xs text-primary">{video.channelTitle}</p>
                )}

                <div className="mt-6 border-t border-border/60 pt-3">
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Watch ${video.title} on YouTube`}
                    className="-ml-2 inline-flex min-h-10 items-center gap-2 rounded-md px-2 font-mono text-sm text-primary underline-offset-4 transition-colors hover:bg-primary/10 hover:underline focus-visible:bg-primary/10 focus-visible:underline"
                  >
                    Watch video <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
