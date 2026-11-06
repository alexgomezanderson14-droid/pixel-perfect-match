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
  onItemClick,
}: {
  lugares: Lugar[];
  focusId?: string | null;
  onPick?: (lat: number, lng: number) => void;
  pick?: { lat: number; lng: number } | null;
  onPenyaClick?: (id: string) => void;
  onItemClick?: (id: string) => void;
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
  const itemClickRef = useRef(onItemClick);
  itemClickRef.current = onItemClick;

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { scrollWheelZoom: false }).setView([38.5810, -0.1030], 16);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    map.current.on("click", (e) => pickRef.current?.(e.latlng.lat, e.latlng.lng));
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => map.current?.invalidateSize({ pan: false }));
    });
    resizeObserver.observe(el.current);
    const resizeTimer = window.setTimeout(() => map.current?.invalidateSize({ pan: false }), 350);
    return () => {
      resizeObserver.disconnect();
      window.clearTimeout(resizeTimer);
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
      const esPenyaMayorales = l.categoria === "penya" && l.nombre.toLocaleLowerCase("es").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").includes("impacte");
      const markerHtml = l.categoria === "penya" && l.foto
        ? esPenyaMayorales
          ? `<div style="position:relative;width:86px;height:76px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;"><div style="position:relative;width:50px;height:50px;box-sizing:border-box;overflow:hidden;border-radius:50%;border:3px solid #f5c451;background:#e6b6c7;box-shadow:0 2px 10px rgba(0,0,0,.45);"><img src="${esc(l.foto)}" alt="" loading="lazy" referrerpolicy="no-referrer" style="display:block;width:100%;height:100%;object-fit:cover;border:0;border-radius:50%;margin:0;padding:0;" /></div><span style="position:absolute;top:-5px;right:9px;width:23px;height:23px;border:2px solid #fff;border-radius:50%;background:#f5c451;color:#49352f;font-size:14px;font-weight:900;line-height:19px;text-align:center;box-shadow:0 2px 5px #0005;">♛</span><span style="margin-top:3px;padding:2px 6px;border-radius:9px;background:#49352f;color:#fff;font-size:8px;font-weight:900;letter-spacing:.04em;white-space:nowrap;box-shadow:0 2px 5px #0004;">MAYORALES 2026</span></div>`
          : `<div class="fest-pin fest-pin-penya fest-pin-photo" style="width:50px;height:50px;box-sizing:border-box;overflow:hidden;border-radius:50%;border:3px solid #fff;background:#e6b6c7;box-shadow:0 2px 8px rgba(0,0,0,.35);padding:0;display:block;"><img src="${esc(l.foto)}" alt="" loading="lazy" referrerpolicy="no-referrer" style="display:block;width:100%;height:100%;max-width:none;max-height:none;object-fit:cover;border:0;border-radius:50%;margin:0;padding:0;" /></div>`
        : esPenyaMayorales
          ? `<div style="position:relative;width:86px;height:58px;display:flex;flex-direction:column;align-items:center;"><div style="width:42px;height:42px;border:3px solid #f5c451;border-radius:50%;background:#49352f;color:#f5c451;font-size:23px;text-align:center;line-height:36px;box-shadow:0 2px 8px #0005;">♛</div><span style="margin-top:2px;padding:2px 6px;border-radius:9px;background:#49352f;color:#fff;font-size:8px;font-weight:900;white-space:nowrap;">MAYORALES 2026</span></div>`
          : `<div class="fest-pin fest-pin-${l.categoria}">${icons[l.categoria]}</div>`;
      const categoryLabel:Record<string,string>={penya:"Peña",actuacion:"Actuación",evento:"Evento",recinto:"Recinto",servicio:"Servicio"};
      const popupHtml = `${img}<small>${categoryLabel[l.categoria]||"Punto de interés"}</small><br/><strong>${esc(l.nombre)}</strong>${l.descripcion ? `<br/><span>${esc(l.descripcion)}</span>` : ""}${l.dia ? `<br/><small>${esc(l.dia)}${l.hora ? " · "+esc(l.hora) : ""}</small>` : ""}${l.categoria === "penya" ? `<br/><button type="button" data-penya-id="${esc(l.id)}" class="fest-popup-detail">Ver ficha de la peña</button>` : l.detalleId ? `<br/><button type="button" data-detail-id="${esc(l.detalleId)}" class="fest-popup-detail">Ver actividad</button>` : ""}`;
      const m = L.marker([l.lat, l.lng], {
        icon: L.divIcon({
          className: "",
          html: markerHtml,
          iconSize: esPenyaMayorales ? [86, 76] : l.categoria === "penya" && l.foto ? [50, 50] : [36, 36],
          iconAnchor: esPenyaMayorales ? [43, 38] : l.categoria === "penya" && l.foto ? [25, 25] : [18, 18],
        }),
      });
      if (l.categoria === "penya") {
        // Al tocar el icono de una peña, abrir directamente su ficha.
        m.on("click", () => penyaClickRef.current?.(l.id));
      } else {
        m.bindPopup(popupHtml);
        if (l.detalleId) {
          m.on("popupopen", (event) => {
            const detailButton = event.popup.getElement()?.querySelector<HTMLButtonElement>("[data-detail-id]");
            detailButton?.addEventListener("click", () => itemClickRef.current?.(l.detalleId!));
          });
        }
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
