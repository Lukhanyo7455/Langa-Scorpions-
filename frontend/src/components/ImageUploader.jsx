import React, { useRef, useState } from "react";
import { api, API_BASE, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

/**
 * Uploads an image to /api/admin/upload and returns a public URL via onUploaded(url).
 * The URL points at /api/files/{storage_path} which streams the object.
 */
export function ImageUploader({ onUploaded, testid = "image-uploader" }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/admin/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      // Backend returns url like "/api/files/<path>". Prepend backend base to make it absolute.
      const backend = process.env.REACT_APP_BACKEND_URL || "";
      const absoluteUrl = data.url.startsWith("http") ? data.url : `${backend}${data.url}`;
      onUploaded(absoluteUrl);
      toast.success("Uploaded!");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="inline-flex items-center gap-2" data-testid={testid}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-primary text-primary hover:bg-primary hover:text-white text-sm font-semibold transition-colors duration-150 disabled:opacity-50"
        data-testid={`${testid}-btn`}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {busy ? "Uploading…" : "Upload image"}
      </button>
      <span className="text-xs text-muted-foreground">Max 8MB · JPG/PNG/WebP</span>
    </div>
  );
}
