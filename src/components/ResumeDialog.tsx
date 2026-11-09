"use client";
import { useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

export default function ResumeDialog() {
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><button className="btn-primary inline-flex items-center gap-2">Download My CV<Download size={18} aria-hidden /></button></DialogTrigger><DialogContent className="max-w-4xl w-[calc(100vw-2rem)] max-h-[92svh] flex flex-col">
    <DialogHeader><DialogTitle>Resume / CV</DialogTitle><DialogDescription>Preview my resume here, or open the PDF in your browser.</DialogDescription></DialogHeader>
    {open && <iframe src="/api/resume#toolbar=0" title="Ardi’s resume preview" className="w-full h-[60svh] min-h-64 rounded border border-border bg-white" />}
    <div className="flex flex-wrap gap-3"><a href="/api/resume?download=1" download className="btn-primary inline-flex items-center gap-2"><Download size={16} />Download PDF</a><a href="/api/resume" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary px-3 py-2"><ExternalLink size={16} />Open PDF</a></div>
    <p className="text-xs text-muted-foreground">If the preview isn’t supported on your device, use Open PDF or Download PDF.</p>
  </DialogContent></Dialog>;
}
