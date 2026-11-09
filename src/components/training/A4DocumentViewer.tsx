import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { renderAsync } from "docx-preview";
import { supabase } from "@/integrations/supabase/client";
import { A4_WIDTH_PX, DECLARATION_BUCKET, fitScale, type DeclarationFileType } from "@/utils/trainingDeclaration";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface A4DocumentViewerHandle {
  /** Unscaled A4 page content, used for printing a signed copy. */
  content: () => HTMLElement | null;
}

interface Props {
  filePath: string;
  fileType: DeclarationFileType;
}

/** Shows an uploaded PDF or Word template as A4 portrait pages, shrunk to fit narrow phone screens. */
const A4DocumentViewer = forwardRef<A4DocumentViewerHandle, Props>(({ filePath, fileType }, ref) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const docxRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(0);

  useImperativeHandle(ref, () => ({ content: () => innerRef.current }), []);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setPages([]);
    (async () => {
      try {
        const { data, error } = await supabase.storage.from(DECLARATION_BUCKET).download(filePath);
        if (error || !data) throw error || new Error("Download failed");
        if (fileType === "pdf") {
          const pdf = await pdfjsLib.getDocument({ data: await data.arrayBuffer() }).promise;
          const images: string[] = [];
          for (let n = 1; n <= pdf.numPages; n++) {
            const page = await pdf.getPage(n);
            const base = page.getViewport({ scale: 1 });
            const viewport = page.getViewport({ scale: (A4_WIDTH_PX * 2) / base.width });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await page.render({ canvasContext: ctx, viewport }).promise;
            images.push(canvas.toDataURL("image/jpeg", 0.92));
          }
          if (!cancelled) { setPages(images); setStatus("ready"); }
        } else {
          if (cancelled || !docxRef.current) return;
          docxRef.current.innerHTML = "";
          await renderAsync(data, docxRef.current, undefined, {
            className: "docx",
            inWrapper: false,
            ignoreWidth: true,
            ignoreHeight: true,
            breakPages: true,
            renderHeaders: true,
            renderFooters: true,
          });
          if (!cancelled) setStatus("ready");
        }
      } catch (e) {
        console.error("Declaration template failed to load:", e);
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [filePath, fileType]);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      const s = fitScale(outer.clientWidth);
      setScale(s);
      setHeight(inner.offsetHeight * s);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    measure();
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outerRef} className="relative w-full overflow-hidden" style={{ height: status === "ready" ? height : undefined }}>
      {status === "loading" && <div role="status" aria-label="Loading document" className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
      {status === "error" && <p className="py-10 text-center text-sm text-destructive">This document could not be opened. Please try again later.</p>}
      <div
        ref={innerRef}
        className="a4-document absolute left-1/2 top-0"
        style={{ width: A4_WIDTH_PX, transform: `translateX(-50%) scale(${scale})`, transformOrigin: "top center", visibility: status === "ready" ? "visible" : "hidden" }}
      >
        {fileType === "pdf"
          ? pages.map((src, i) => <div key={i} className="a4-page"><img src={src} alt={`Page ${i + 1}`} className="block h-full w-full object-contain" /></div>)
          : <div ref={docxRef} className="a4-docx" />}
      </div>
    </div>
  );
});

A4DocumentViewer.displayName = "A4DocumentViewer";
export default A4DocumentViewer;
