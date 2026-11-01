import { useEffect, useState } from "react";

export default function ZoomableImage({ src, alt, thumbStyle }) {
  const [open, setOpen] = useState(false);

  // Tutup dengan tombol Escape
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!src) return null;

  return (
    <>
      <img
        src={src}
        alt={alt}
        title="Klik untuk memperbesar"
        onClick={() => setOpen(true)}
        style={{ ...thumbStyle, cursor: "zoom-in" }}
      />

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16, cursor: "zoom-out",
          }}
        >
          <img
            src={src}
            alt={alt}
            style={{
              maxWidth: "95vw", maxHeight: "90vh",
              objectFit: "contain", borderRadius: 8, background: "#fff",
            }}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup"
            style={{
              position: "absolute", top: 12, right: 16,
              fontSize: 28, lineHeight: 1, color: "#fff",
              background: "transparent", border: "none", cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}