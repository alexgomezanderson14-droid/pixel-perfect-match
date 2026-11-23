import type { CSSProperties } from "react";

export type WelcomePenyaLogo = { id: string; nombre: string; foto: string };
export type WelcomeBubbleSettings = { logos: Record<string, string>; offsetY: number };

export const welcomeBubbleLayout = [
  { id: "left-glass", x: 14, y: 46, size: 17, defaultLogo: false },
  { id: "la-clau", x: 22, y: 31, size: 17, defaultLogo: true },
  { id: "top-orb", x: 36, y: 22, size: 26, defaultLogo: false },
  { id: "tiny-top", x: 47, y: 26, size: 5, defaultLogo: false },
  { id: "small-top", x: 54, y: 29, size: 7, defaultLogo: false },
  { id: "center", x: 50, y: 51, size: 25, defaultLogo: true },
  { id: "pink", x: 69, y: 34, size: 18, defaultLogo: true },
  { id: "inquisidors", x: 88, y: 34, size: 18, defaultLogo: true },
  { id: "world", x: 68, y: 56, size: 16, defaultLogo: true },
  { id: "black", x: 85, y: 59, size: 19, defaultLogo: true },
  { id: "green", x: 23, y: 65, size: 18, defaultLogo: true },
  { id: "bottom", x: 52, y: 84, size: 14, defaultLogo: false },
  { id: "lower-left", x: 37, y: 76, size: 10, defaultLogo: false },
  { id: "lower-mid", x: 45, y: 88, size: 6, defaultLogo: false },
  { id: "lower-right", x: 63, y: 86, size: 9, defaultLogo: false },
  { id: "right-small", x: 85, y: 86, size: 5, defaultLogo: false },
] as const;

export function parseWelcomeBubbleSettings(value?: string): WelcomeBubbleSettings {
  try {
    const parsed = JSON.parse(value || "{}");
    return {
      logos: parsed?.logos && typeof parsed.logos === "object" ? parsed.logos : {},
      offsetY: Number.isFinite(Number(parsed?.offsetY)) ? Math.max(-120, Math.min(120, Number(parsed.offsetY))) : 0,
    };
  } catch {
    return { logos: {}, offsetY: 0 };
  }
}

type Props = { penyes?: WelcomePenyaLogo[]; scale?: number; settings?: string; className?: string };

export default function WelcomeBubbleComposition({ penyes = [], scale = 100, settings = "", className = "" }: Props) {
  const config = parseWelcomeBubbleSettings(settings);
  const available = penyes.filter((penya) => penya.foto);
  const bubbles = welcomeBubbleLayout.map((bubble, index) => {
    const chosenId = config.logos[bubble.id] || (bubble.defaultLogo ? available[index % Math.max(1, available.length)]?.id : "");
    return { ...bubble, logo: available.find((penya) => penya.id === chosenId) };
  });
  const style = {
    "--welcome-art-scale": Math.min(200, Math.max(50, scale)) / 100,
    "--welcome-art-offset": config.offsetY + "px",
    marginBottom: Math.abs(config.offsetY) + "px",
  } as CSSProperties;

  return (
    <div className={"welcome-bubble-composition " + className} style={style} aria-label="Composición de burbujas de cristal con logotipos de peñas">
      <svg className="welcome-bubble-filter-defs" aria-hidden="true" focusable="false">
        <defs>
          <filter id="welcome-bubble-fisheye" x="-18%" y="-18%" width="136%" height="136%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.012" numOctaves="2" seed="8" result="warp" />
            <feDisplacementMap in="SourceGraphic" in2="warp" scale="23" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      {bubbles.map((bubble, index) => (
        <div key={bubble.id} className={"welcome-bubble welcome-bubble-" + index + (bubble.logo ? " has-penya-logo" : "")}
          style={{ left: bubble.x + "%", top: bubble.y + "%", width: bubble.size + "%" }}
          title={bubble.logo?.nombre || "Burbuja decorativa"}>
          {bubble.logo && <img src={bubble.logo.foto} alt={bubble.logo.nombre} loading="eager" />}
          <span className="welcome-bubble-glass" aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}
