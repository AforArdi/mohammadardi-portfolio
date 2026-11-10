"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Download, LoaderCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

const PdfPreview = dynamic(() => import("./PdfPreview"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-64 gap-3 bg-card/60 rounded border border-border text-muted-foreground">
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
          Download My CV
          <Download size={18} aria-hidden />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-[calc(100vw-2rem)] max-h-[92svh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Resume / CV</DialogTitle>
          <DialogDescription>Preview my resume here, then download a PDF copy.</DialogDescription>
        </DialogHeader>

        {open && <PdfPreview onPdfLoaded={setCachedBuffer} />}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void downloadResume()}
            disabled={downloading}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            {downloading ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}
            {downloading ? "Downloading…" : "Download PDF"}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}
        <p className="text-xs text-muted-foreground">If your browser cannot show the preview, use Download PDF.</p>
      </DialogContent>
    </Dialog>
  );
}
