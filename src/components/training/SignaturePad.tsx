import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";

const HEIGHT = 200;

/** Finger/mouse signature box. Calls onChange with a PNG data URL, or null when cleared. */
const SignaturePad = ({ onChange, disabled = false }: { onChange: (dataUrl: string | null) => void; disabled?: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  const setup = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = HEIGHT * ratio;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.clientWidth, HEIGHT);
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setEmpty(true);
    onChange(null);
  };

  useEffect(() => {
    setup();
    let width = canvasRef.current?.clientWidth ?? 0;
    const onResize = () => {
      const w = canvasRef.current?.clientWidth ?? 0;
      if (w !== width) { width = w; setup(); }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = point(e);
    last.current = p;
    const ctx = e.currentTarget.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = "#111111";
    ctx.fill();
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    e.preventDefault();
    const p = point(e);
    const ctx = e.currentTarget.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    setEmpty(false);
    onChange(canvasRef.current?.toDataURL("image/png") ?? null);
  };

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-md border-2 border-dashed border-primary/40">
        <canvas
          ref={canvasRef}
          aria-label="Signature box. Sign with your finger."
          className="block w-full cursor-crosshair touch-none"
          style={{ height: HEIGHT }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
        />
        {empty && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Sign here with your finger</span>}
        <span className="pointer-events-none absolute bottom-10 left-6 right-6 border-b border-border" />
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="outline" className="min-h-11" onClick={setup} disabled={disabled || empty}><Eraser />Clear signature</Button>
      </div>
    </div>
  );
};

export default SignaturePad;
