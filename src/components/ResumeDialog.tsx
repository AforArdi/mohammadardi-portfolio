"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Download, FileText, LoaderCircle, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

const PdfPreview = dynamic(() => import("./PdfPreview"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-muted-foreground" role="status">
      <LoaderCircle size={28} className="animate-spin text-primary" aria-hidden />
      <p className="text-sm">Initializing preview…</p>
    </div>
  ),
});

export default function ResumeDialog() {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [cachedBuffer, setCachedBuffer] = useState<ArrayBuffer | null>(null);

  async function downloadResume() {
    if (downloading) return;
    setDownloading(true);
    setError("");
    try {
      let buffer = cachedBuffer;
      if (!buffer) {
        const response = await fetch("/api/resume?download=1", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(
            response.status === 429
              ? "Too many resume requests. Please try again later."
              : "The resume could not be downloaded. Please try again later."
          );
        }
        if (!response.headers.get("content-type")?.toLowerCase().startsWith("application/pdf")) {
          throw new Error("The server did not return a PDF. Please try again later.");
        }
        const data = await response.blob();
        if ((await data.slice(0, 5).text()) !== "%PDF-") {
          throw new Error("The downloaded file is not a valid PDF.");
        }
        buffer = await data.arrayBuffer();
        setCachedBuffer(buffer);
      }

      const blob = new Blob([buffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Mohammad-Ardi-Resume.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="btn-primary inline-flex items-center gap-2">
          View My CV
          <FileText size={18} aria-hidden />
        </button>
      </DialogTrigger>
      <DialogContent variant="fullscreen" showCloseButton={false}>
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-3 sm:px-6 sm:py-4">
        <DialogHeader className="min-w-0 text-left">
          <DialogTitle>Resume / CV</DialogTitle>
          <DialogDescription className="sr-only sm:not-sr-only sm:text-sm sm:text-muted-foreground">Read the full resume here. Zoom in for a closer look.</DialogDescription>
        </DialogHeader>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => void downloadResume()}
            disabled={downloading}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 text-sm text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            {downloading ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}
            {downloading ? "Saving…" : <><span>Download</span><span className="hidden sm:inline">PDF</span></>}
          </button>
          <DialogClose className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-border hover:bg-muted" aria-label="Close resume viewer"><X size={20} /></DialogClose>
        </div>
        </header>
        {error && (
          <p role="alert" className="shrink-0 border-b border-border px-4 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        {open && <PdfPreview initialBuffer={cachedBuffer} onPdfLoaded={setCachedBuffer} />}
      </DialogContent>
    </Dialog>
  );
}
