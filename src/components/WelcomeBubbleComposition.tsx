import type { CSSProperties } from "react";

export type WelcomePenyaLogo = { id: string; nombre: string; foto: string };

const bubbleLayout = [
  { x: 2, y: 40, size: 19, logo: false },
  { x: 13, y: 12, size: 23, logo: true },
  { x: 31, y: 2, size: 22, logo: false },
  { x: 38, y: 28, size: 36, logo: true },
  { x: 64, y: 13, size: 23, logo: true },
  { x: 79, y: 37, size: 20, logo: true },
  { x: 17, y: 58, size: 25, logo: true },
  { x: 57, y: 65, size: 20, logo: false },
  { x: 74, y: 67, size: 19, logo: true },
  { x: 44, y: 76, size: 15, logo: false },
  { x: 89, y: 13, size: 14, logo: false },
  { x: 30, y: 78, size: 12, logo: false },
] as const;

type Props = { penyes?: WelcomePenyaLogo[]; scale?: number; className?: string };

export default function WelcomeBubbleComposition({ penyes = [], scale = 100, className = "" }: Props) {
  const logos = penyes.filter((penya) => penya.foto).slice(0, 6);
  const bubbles = bubbleLayout.map((bubble, index) => ({
    ...bubble,
    logo: bubble.logo ? logos.shift() : undefined,
  }));
  const style = { "--welcome-art-scale": Math.min(200, Math.max(50, scale)) / 100 } as CSSProperties;

  return (
    <div className={`welcome-bubble-composition ${className}`} style={style} aria-label="Composición de burbujas con logotipos de peñas">
      {bubbles.map((bubble, index) => (
        <div
          key={index}
          className={`welcome-bubble ${bubble.logo ? "has-penya-logo" : ""} welcome-bubble-${index}`}
          style={{ left: bubble.x + "%", top: bubble.y + "%", width: bubble.size + "%" }}
          title={bubble.logo?.nombre}
        >
          {bubble.logo && <img src={bubble.logo.foto} alt={bubble.logo.nombre} loading="eager" />}
        </div>
      ))}
    </div>
  );
}
