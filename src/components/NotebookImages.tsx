import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { IMG_MARKER } from "../lib/imageStore";

/** Signature for "user tapped an inline photo" — the id is an imageStore marker id. */
export type PhotoOpenHandler = (id: string) => void;

/** Ordered photo ids as they appear in a body (for the lightbox prev/next). */
export function photoIdsInBody(body: string): string[] {
  const out: string[] = [];
  for (const line of body.split("\n")) {
    const m = line.trim().match(IMG_MARKER);
    if (m) out.push(m[1]);
  }
  return out;
}
import { getImage } from "../lib/imageStore";

/** Resolve an image id → object URL. Fetches blob from IndexedDB once, revokes on unmount/re-fetch. */
export function useObjectUrl(id: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!id) {
      setUrl(null);
      return;
    }
    let revoked = false;
    let objectUrl: string | null = null;
    let alive = true;
    void getImage(id)
      .then((blob) => {
        if (!alive) return;
        if (!blob) {
          setUrl(null);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        if (!revoked) setUrl(objectUrl);
      })
      .catch(() => {
        if (alive) setUrl(null);
      });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      revoked = true;
    };
  }, [id]);
  return url;
}

/** A photo embedded inline in the body (rendered from a {{img:…}} marker line). Click opens the lightbox. */
export function InlinePhoto({
  id,
  onOpen,
  alt
}: {
  id: string;
  onOpen: PhotoOpenHandler;
  alt?: string;
}) {
  const url = useObjectUrl(id);
  return (
    <span
      role="button"
      tabIndex={0}
      className="nb-inline-photo"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(id);
        }
      }}
      aria-label={alt ?? "photo"}
      data-photo-id={id}
    >
      {url ? (
        <img src={url} alt="" loading="lazy" draggable={false} />
      ) : (
        <span data-photo-placeholder />
      )}
    </span>
  );
}

/** Full-screen image viewer. Prev/next between ids, Esc or backdrop click closes. */
export function PhotoLightbox({
  ids,
  index,
  onClose,
  onNavigate
}: {
  ids: string[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const id = ids[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNavigate((index - 1 + ids.length) % ids.length);
      if (e.key === "ArrowRight") onNavigate((index + 1) % ids.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNavigate, index, ids.length]);

  return (
    <div className="nb-lightbox" onClick={onClose} role="dialog" aria-modal="true">
      <button type="button" className="nb-lightbox-close" onClick={onClose} aria-label="Close">
        <X size={22} strokeWidth={2} />
      </button>
      {ids.length > 1 ? (
        <>
          <button
            type="button"
            className="nb-lightbox-nav prev"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate((index - 1 + ids.length) % ids.length);
            }}
            aria-label="Previous"
          >
            <ChevronLeft size={28} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="nb-lightbox-nav next"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate((index + 1) % ids.length);
            }}
            aria-label="Next"
          >
            <ChevronRight size={28} strokeWidth={2} />
          </button>
          <div className="nb-lightbox-count">
            {index + 1} / {ids.length}
          </div>
        </>
      ) : null}
      <div className="nb-lightbox-stage" onClick={(e) => e.stopPropagation()}>
        <LightboxImage key={id} id={id} />
      </div>
    </div>
  );
}

function LightboxImage({ id }: { id: string }) {
  const url = useObjectUrl(id);
  if (!url) return null;
  return <img src={url} alt="" className="nb-lightbox-img" />;
}