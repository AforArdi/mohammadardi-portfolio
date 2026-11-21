"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { canvasOutputScale } from "@/lib/pdf/preview-layout";

export default function PdfPage({ document, pageNumber, width, scrollRoot }: {
  document: PDFDocumentProxy; pageNumber: number; width: number; scrollRoot: HTMLElement;
}) {
  const host = useRef<HTMLDivElement>(null);
  const bitmap = useRef<HTMLDivElement>(null);
  const [nearby, setNearby] = useState(false);
  const [ratio, setRatio] = useState(1 / Math.SQRT2);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [text, setText] = useState("");

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setNearby(entry.isIntersecting), { root: scrollRoot, rootMargin: "600px" });
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, [scrollRoot]);

  useEffect(() => {
    if (!nearby) return;
    let cancelled = false;
    let task: RenderTask | undefined;
    // Each render owns its canvas: rapid zoom changes cannot reuse an active bitmap.
    const canvas = window.document.createElement("canvas");
    canvas.className = "block";
    canvas.setAttribute("aria-hidden", "true");
    setState("loading");
    async function render() {
      try {
        const page = await document.getPage(pageNumber);
        if (cancelled) return;
        const natural = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: width / natural.width });
        setRatio(natural.width / natural.height);
        const scale = canvasOutputScale(viewport.width, viewport.height, window.devicePixelRatio || 1);
        canvas.width = Math.max(1, Math.floor(viewport.width * scale));
        canvas.height = Math.max(1, Math.floor(viewport.height * scale));
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas unavailable");
        bitmap.current?.appendChild(canvas);
        task = page.render({ canvas, canvasContext: context, viewport, transform: [scale, 0, 0, scale, 0, 0] });
        await task.promise;
        if (cancelled) return;
        setState("ready");
        const content = await page.getTextContent().catch(() => null);
        if (!cancelled && content) setText(content.items.map(item => "str" in item ? item.str : "").join(" "));
      } catch {
        if (!cancelled) setState("error");
      }
    }
    void render();
    return () => {
      cancelled = true;
      task?.cancel();
      canvas.remove();
      // Release backing memory when the page moves away from the viewport.
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [nearby, document, pageNumber, width]);

  return <article aria-label={`Resume page ${pageNumber}`} className="shrink-0">
    <div ref={host} className="relative bg-white shadow-xl" style={{ width, aspectRatio: ratio }} aria-busy={nearby && state === "loading"}>
      <div ref={bitmap} />
      {(!nearby || state !== "ready") && <div className="absolute inset-0 grid place-items-center bg-white text-slate-600 text-sm p-4 text-center" role={nearby ? "status" : undefined}>
        {state === "error" ? `Page ${pageNumber} could not be displayed. Try Fit width or download the PDF.` : nearby ? `Rendering page ${pageNumber}…` : `Page ${pageNumber}`}
      </div>}
    </div>
    {text && <p className="sr-only">{text}</p>}
    <p className="text-center text-xs text-muted-foreground py-3" aria-hidden="true">Page {pageNumber}</p>
  </article>;
}
