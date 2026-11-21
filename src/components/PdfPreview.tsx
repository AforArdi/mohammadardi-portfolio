"use client";

import { useEffect, useState } from "react";
import type { PDFDocumentProxy, PDFDocumentLoadingTask } from "pdfjs-dist";
import { LoaderCircle, AlertCircle, Minus, Plus, ScanLine } from "lucide-react";
import { clampZoom, MIN_ZOOM, MAX_ZOOM } from "@/lib/pdf/preview-layout";
import PdfPage from "./PdfPage";

interface PdfPreviewProps {
  onPdfLoaded?: (buffer: ArrayBuffer) => void;
  initialBuffer?: ArrayBuffer | null;
}

export default function PdfPreview({ onPdfLoaded, initialBuffer }: PdfPreviewProps) {
  const [source] = useState(initialBuffer);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const [availableWidth, setAvailableWidth] = useState(800);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    let loadingTask: PDFDocumentLoadingTask | undefined;
    async function load() {
      try {
        let buffer = source;
        if (!buffer) {
          const response = await fetch("/api/resume", { cache: "no-store", signal: controller.signal });
          if (!response.ok) throw new Error(response.status === 429 ? "Too many resume requests. Please try again later." : "The resume could not be loaded. Please try again later.");
          if (!response.headers.get("content-type")?.toLowerCase().startsWith("application/pdf")) throw new Error("The server did not return a PDF.");
          buffer = await response.arrayBuffer();
        }
        if (cancelled) return;
        if (new TextDecoder().decode(buffer.slice(0, 5)) !== "%PDF-") throw new Error("The document is not a valid PDF.");
        onPdfLoaded?.(buffer);
        const pdfjs = await import("pdfjs-dist");
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer.slice(0)) });
        const loaded = await loadingTask.promise;
        if (!cancelled) setDocument(loaded);
      } catch (error) {
        if (!cancelled) setError(error instanceof Error ? error.message : "Unable to preview this PDF.");
      }
    }
    void load();
    return () => {
      cancelled = true;
      controller.abort();
      void loadingTask?.destroy().catch(() => undefined);
    };
  }, [source, onPdfLoaded]);

  useEffect(() => {
    if (!scrollRoot) return;
    const measure = () => {
      const style = getComputedStyle(scrollRoot);
      setAvailableWidth(Math.max(160, scrollRoot.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scrollRoot);
    return () => observer.disconnect();
  }, [scrollRoot]);

  const pageWidth = Math.floor(Math.min(availableWidth, 1100) * zoom);
  const toolbarButton = "inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-40";
  return <div className="flex min-h-0 flex-1 flex-col">
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-card/50 px-3 py-2 sm:px-6">
      <p className="text-xs text-muted-foreground" role="status">{document ? `${document.numPages} ${document.numPages === 1 ? "page" : "pages"} · Scroll to read` : "Resume preview"}</p>
      <div role="group" aria-label="Resume zoom controls" className="flex items-center gap-2">
        <button type="button" className={toolbarButton} disabled={!document || zoom <= MIN_ZOOM} onClick={() => setZoom(value => clampZoom(value - 0.25))} aria-label="Zoom out"><Minus size={16} /></button>
        <output aria-live="polite" className="w-12 text-center text-xs font-mono" aria-label="Zoom relative to fit width">{Math.round(zoom * 100)}%</output>
        <button type="button" className={toolbarButton} disabled={!document || zoom >= MAX_ZOOM} onClick={() => setZoom(value => clampZoom(value + 0.25))} aria-label="Zoom in"><Plus size={16} /></button>
        <button type="button" className={toolbarButton} disabled={!document} onClick={() => setZoom(1)} aria-label="Fit resume to width"><ScanLine size={16} /><span>Fit width</span></button>
      </div>
    </div>
    <div ref={setScrollRoot} tabIndex={0} role="region" aria-label="Resume PDF preview" aria-busy={!document && !error} className="no-scrollbar relative min-h-0 flex-1 overflow-auto overscroll-contain bg-muted/20 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:p-6">
      {error ? <div role="alert" className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center"><AlertCircle size={28} /><p>{error}</p><p className="text-sm text-muted-foreground">You can still try Download PDF above.</p></div>
        : !document ? <div role="status" className="flex h-full min-h-48 flex-col items-center justify-center gap-3 text-muted-foreground"><LoaderCircle size={28} className="animate-spin" aria-hidden="true" /><p>Loading resume preview…</p></div>
        : scrollRoot && <div className="pdf-canvas-container mx-auto flex flex-col gap-3" style={{ width: pageWidth }}>
          {Array.from({ length: document.numPages }, (_, index) => <PdfPage key={index} document={document} pageNumber={index + 1} width={pageWidth} scrollRoot={scrollRoot} />)}
        </div>}
    </div>
  </div>;
}
