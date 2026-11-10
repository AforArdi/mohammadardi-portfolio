"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, AlertCircle } from "lucide-react";

interface PdfPreviewProps {
  onPdfLoaded?: (buffer: ArrayBuffer) => void;
}

const MAX_PREVIEW_PAGES = 10;

export default function PdfPreview({ onPdfLoaded }: PdfPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let activePdfDoc: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeRenderTasks: any[] = [];

    async function loadPdf() {
      try {
        setLoading(true);
        setError(null);

        // Fetch the PDF from our private rate-limited API with abort signal
        const response = await fetch("/api/resume", {
          cache: "no-store",
          signal: abortController.signal,
        });
        if (!response.ok) {
          if (response.status === 429) {
            throw new Error("Too many resume requests. Please try again later.");
          }
          if (response.status === 404) {
            throw new Error("Resume is currently unavailable.");
          }
          throw new Error("Unable to load resume preview.");
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.toLowerCase().startsWith("application/pdf")) {
          throw new Error("Invalid document format received.");
        }

        const buffer = await response.arrayBuffer();
        if (cancelled) return;

        // Verify PDF signature (%PDF-)
        const header = new TextDecoder().decode(new Uint8Array(buffer.slice(0, 5)));
        if (header !== "%PDF-") {
          throw new Error("The document is not a valid PDF.");
        }

        onPdfLoaded?.(buffer);

        // Dynamically load pdfjs-dist on client
        const pdfjs = await import("pdfjs-dist");
        if (cancelled) return;

        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(buffer.slice(0)), // Worker transfer must not detach the download cache.
          cMapUrl: undefined,
          cMapPacked: true,
        });

        const pdfDoc = await loadingTask.promise;
        if (cancelled) {
          void loadingTask.destroy();
          return;
        }

        activePdfDoc = pdfDoc;
        const total = pdfDoc.numPages;
        setNumPages(total);

        // Render each page to a canvas
        const container = containerRef.current;
        if (!container) return;

        // Clear any previous canvas elements except loading indicator
        const canvasContainer = container.querySelector(".pdf-canvas-container");
        if (canvasContainer) {
          canvasContainer.innerHTML = "";
        }

        const targetWidth = Math.min(container.clientWidth || 700, 800) - 32; // account for padding
        const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
        const pagesToRender = Math.min(total, MAX_PREVIEW_PAGES);

        for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
          if (cancelled) break;

          const page = await pdfDoc.getPage(pageNum);
          if (cancelled) break;

          const unscaledViewport = page.getViewport({ scale: 1.0 });
          const scale = (targetWidth / unscaledViewport.width) * dpr;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.className = "w-full max-w-full h-auto rounded shadow-sm border border-border/40 bg-white";
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.maxWidth = `${Math.floor(viewport.width / dpr)}px`;

          const canvasContext = canvas.getContext("2d");
          if (!canvasContext) continue;

          canvasContainer?.appendChild(canvas);

          const renderTask = page.render({
            canvas,
            canvasContext,
            viewport,
          });
          activeRenderTasks.push(renderTask);

          await renderTask.promise;
        }

        if (!cancelled) {
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled && (err as Error)?.name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Failed to load preview.");
          setLoading(false);
        }
      }
    }

    void loadPdf();

    return () => {
      cancelled = true;
      abortController.abort();
      for (const task of activeRenderTasks) {
        try {
          task.cancel();
        } catch {
          // Task already completed or cancelled
        }
      }
      if (activePdfDoc) {
        try {
          void activePdfDoc.destroy();
        } catch {
          // Document already destroyed
        }
      }
    };
  }, [onPdfLoaded]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-label="Resume PDF preview"
      className="overflow-y-auto no-scrollbar max-h-[60svh] min-h-64 rounded border border-border bg-card/60 p-4 focus-visible:ring-1 focus-visible:ring-primary outline-none relative"
    >
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/80 backdrop-blur-sm z-10 text-muted-foreground">
          <LoaderCircle size={28} className="animate-spin text-primary" aria-hidden />
          <p className="text-sm">Loading resume preview…</p>
        </div>
      )}

      {error ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center p-6 text-muted-foreground">
          <AlertCircle size={32} className="text-muted-foreground/60" aria-hidden />
          <p className="text-sm text-foreground font-medium">{error}</p>
          <p className="text-xs">You can still download the PDF directly using the button below.</p>
        </div>
      ) : (
        <div className="pdf-canvas-container flex flex-col items-center gap-4 w-full" />
      )}

      {!loading && !error && numPages > 1 && (
        <p className="text-center text-xs text-muted-foreground mt-2 pb-1">
          {numPages > MAX_PREVIEW_PAGES
            ? `Showing first ${MAX_PREVIEW_PAGES} of ${numPages} pages — scroll or download PDF for full document`
            : `Page 1 of ${numPages} — scroll to view more`}
        </p>
      )}
    </div>
  );
}
