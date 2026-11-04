import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Lugar } from "@/content/fiestas";
import { useLang } from "@/lib/i18n";

const icons: Record<string, string> = { penya: "★", actuacion: "♪", evento: "●", recinto: "◆", servicio: "+" };

export default function FestMap({ lugares, focusId }: { lugares: Lugar[]; focusId: string | null }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<Record<string, L.Marker>>({});
  const layer = useRef<L.LayerGroup | null>(null);
  const { t } = useLang();

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { scrollWheelZoom: false }).setView([38.5810, -0.1030], 16);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!layer.current) return;
    layer.current.clearLayers();
    markers.current = {};
    lugares.forEach((l) => {
      const m = L.marker([l.lat, l.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div class="fest-pin fest-pin-${l.categoria}">${icons[l.categoria]}</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
      }).bindPopup(`<strong>${t(l.nombre)}</strong><br/><span>${t(l.descripcion)}</span>`);
      m.addTo(layer.current!);
      markers.current[l.id] = m;
    });
  }, [lugares, t]);

  useEffect(() => {
    if (!focusId || !map.current) return;
    const m = markers.current[focusId];
    if (m) {
      map.current.flyTo(m.getLatLng(), 18, { duration: 0.8 });
      m.openPopup();
    }
  }, [focusId, lugares]);

  return <div ref={el} className="h-full w-full" />;
}
