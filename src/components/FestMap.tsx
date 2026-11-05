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
  onPenyaClick,
}: {
  lugares: Lugar[];
  focusId?: string | null;
  onPick?: (lat: number, lng: number) => void;
  pick?: { lat: number; lng: number } | null;
  onPenyaClick?: (id: string) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<Record<string, L.Marker>>({});
  const layer = useRef<L.LayerGroup | null>(null);
  const pickMarker = useRef<L.Marker | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const penyaClickRef = useRef(onPenyaClick);
  penyaClickRef.current = onPenyaClick;

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
      const markerHtml = l.categoria === "penya" && l.foto
        ? `<div class="fest-pin fest-pin-penya fest-pin-photo" style="width:50px;height:50px;box-sizing:border-box;overflow:hidden;border-radius:50%;border:3px solid #fff;background:#e6b6c7;box-shadow:0 2px 8px rgba(0,0,0,.35);padding:0;display:block;"><img src="${esc(l.foto)}" alt="" loading="lazy" referrerpolicy="no-referrer" style="display:block;width:100%;height:100%;max-width:none;max-height:none;object-fit:cover;border:0;border-radius:50%;margin:0;padding:0;" /></div>`
        : `<div class="fest-pin fest-pin-${l.categoria}">${icons[l.categoria]}</div>`;
      const popupHtml = `${img}<strong>${esc(l.nombre)}</strong>${l.descripcion ? `<br/><span>${esc(l.descripcion)}</span>` : ""}${l.categoria === "penya" ? `<br/><button type="button" data-penya-id="${esc(l.id)}" class="fest-popup-detail">Ver ficha de la peña</button>` : ""}`;
      const m = L.marker([l.lat, l.lng], {
        icon: L.divIcon({
          className: "",
          html: markerHtml,
          iconSize: l.categoria === "penya" && l.foto ? [50, 50] : [36, 36],
          iconAnchor: l.categoria === "penya" && l.foto ? [25, 25] : [18, 18],
        }),
      }).bindPopup(popupHtml);
      if (l.categoria === "penya") {
        m.on("popupopen", (event) => {
          const button = event.popup.getElement()?.querySelector<HTMLButtonElement>("[data-penya-id]");
          button?.addEventListener("click", () => penyaClickRef.current?.(l.id));
        });
      }
      m.addTo(layer.current!);
      markers.current[l.id] = m;
    });
  }, [lugares]);

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
