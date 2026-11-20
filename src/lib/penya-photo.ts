export type PenyaPhotoCrop = { zoom?: number | null; x?: number | null; y?: number | null };

/** Shared crop for every circular rendering of a peña profile photo. */
export function getPenyaPhotoImageStyle(settings: PenyaPhotoCrop = {}) {
  const zoom = Math.max(70, Math.min(200, Number(settings.zoom ?? 100)));
  const x = Math.max(0, Math.min(100, Number(settings.x ?? 50)));
  const y = Math.max(0, Math.min(100, Number(settings.y ?? 50)));
  return {
    objectPosition: `${x}% ${y}%`,
    transform: `scale(${zoom / 100})`,
    transformOrigin: "center center",
  } as const;
}

export function getPenyaPhotoInlineStyle(settings: PenyaPhotoCrop = {}) {
  const style = getPenyaPhotoImageStyle(settings);
  return `object-position:${style.objectPosition};transform:${style.transform};transform-origin:${style.transformOrigin};`;
}
