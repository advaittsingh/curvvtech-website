import { useCallback, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Longest side the stored image is downscaled to (keeps data URIs small). */
  maxDimension?: number;
  hint?: string;
  className?: string;
};

const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
const MAX_SOURCE_BYTES = 8 * 1024 * 1024; // 8MB source cap before downscale

/**
 * Downscale an image file to a PNG data URI (transparency preserved) whose
 * longest side is <= maxDimension. SVGs are stored as-is (already tiny/vector).
 */
function fileToDataUri(file: File, maxDimension: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const src = String(reader.result);
      if (file.type === "image/svg+xml") {
        resolve(src);
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error("Could not load image"));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

export function ImageDropField({ label, value, onChange, maxDimension = 512, hint, className }: Props) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      setErr(null);
      if (!file) return;
      if (!ACCEPTED.includes(file.type)) {
        setErr("Please use a PNG, JPG, WEBP, GIF, or SVG image.");
        return;
      }
      if (file.size > MAX_SOURCE_BYTES) {
        setErr("Image is too large (max 8MB).");
        return;
      }
      setBusy(true);
      try {
        onChange(await fileToDataUri(file, maxDimension));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not process image");
      } finally {
        setBusy(false);
      }
    },
    [maxDimension, onChange],
  );

  return (
    <div className={className}>
      <Label>{label}</Label>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {value ? (
        <div className="mt-1 flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-2">
          <img
            src={value}
            alt={label}
            className="h-16 w-16 rounded-md border border-border bg-white object-contain"
          />
          <div className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-xs font-medium text-primary hover:underline"
            >
              Replace
            </button>
            <span className="text-muted-foreground">·</span>
            <button
              type="button"
              onClick={() => onChange("")}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-red-600"
            >
              <X className="h-3 w-3" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void handleFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "mt-1 flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center transition-colors",
            dragging && "border-primary bg-primary/5",
          )}
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="text-xs font-medium">
            {busy ? "Processing…" : "Drag & drop an image, or click to browse"}
          </span>
          <span className="text-[10px] text-muted-foreground">PNG, JPG, WEBP, GIF or SVG</span>
        </button>
      )}
      {hint && !err && <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>}
      {err && <p className="mt-1 text-[10px] text-red-600">{err}</p>}
    </div>
  );
}
