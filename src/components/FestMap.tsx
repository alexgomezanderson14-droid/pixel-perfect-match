import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Lugar } from "@/content/fiestas";

const icons: Record<string, string> = { penya: "★", actuacion: "♪", evento: "●", recinto: "◆", servicio: "+" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export default function FestMap({
  lugares,
  focusId,
  onPick,
  pick,
}: {
  lugares: Lugar[];
  focusId?: string | null;
  onPick?: (lat: number, lng: number) => void;
  pick?: { lat: number; lng: number } | null;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<Record<string, L.Marker>>({});
  const layer = useRef<L.LayerGroup | null>(null);
  const pickMarker = useRef<L.Marker | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { scrollWheelZoom: false }).setView([38.5810, -0.1030], 16);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    map.current.on("click", (e) => pickRef.current?.(e.latlng.lat, e.latlng.lng));
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
      const img = l.foto ? `<img src="${esc(l.foto)}" alt="" style="width:180px;height:110px;object-fit:cover;border-radius:10px;margin-bottom:6px"/>` : "";
      const m = L.marker([l.lat, l.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div class="fest-pin fest-pin-${l.categoria}">${icons[l.categoria]}</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
      }).bindPopup(`${img}<strong>${esc(l.nombre)}</strong>${l.descripcion ? `<br/><span>${esc(l.descripcion)}</span>` : ""}`);
      m.addTo(layer.current!);
      markers.current[l.id] = m;
    });
  }, [lugares, onPenyaClick]);

  useEffect(() => {
    if (!map.current) return;
    if (!pick) {
      pickMarker.current?.remove();
      pickMarker.current = null;
      return;
    }
    if (!pickMarker.current) pickMarker.current = L.marker([pick.lat, pick.lng], {
      icon: L.divIcon({ className: "", html: `<div class="fest-pin fest-pin-penya">★</div>`, iconSize: [36, 36], iconAnchor: [18, 18] }),
    }).addTo(map.current);
    else pickMarker.current.setLatLng([pick.lat, pick.lng]);
    map.current.panTo([pick.lat, pick.lng]);
  }, [pick]);

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
