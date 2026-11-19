import { useEffect, useRef, useState } from "react";
import type { Lugar } from "@/content/fiestas";

type MapLibreApi = {
  Map: new (options: any) => any;
  Marker: new (options?: any) => any;
  Popup: new (options?: any) => any;
  NavigationControl: new (options?: any) => any;
};
declare global {
  interface Window { maplibregl?: MapLibreApi; }
}

let mapLibreLoader: Promise<MapLibreApi> | null = null;
function loadMapLibre(): Promise<MapLibreApi> {
  if (typeof window !== "undefined" && window.maplibregl) return Promise.resolve(window.maplibregl);
  if (!mapLibreLoader) {
    mapLibreLoader = new Promise((resolve, reject) => {
      const cssId = "festalfas-maplibre-css";
      if (!document.getElementById(cssId)) {
        const link = document.createElement("link");
        link.id = cssId;
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.css";
        document.head.appendChild(link);
      }
      const existing = document.querySelector<HTMLScriptElement>('script[data-festalfas-maplibre="true"]');
      if (existing) {
        existing.addEventListener("load", () => window.maplibregl ? resolve(window.maplibregl) : reject(new Error("MapLibre no disponible")));
        existing.addEventListener("error", () => reject(new Error("No se pudo cargar MapLibre")));
        return;
      }
      const script = document.createElement("script");
      script.src = "https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.js";
      script.async = true;
      script.dataset.festalfasMaplibre = "true";
      script.onload = () => window.maplibregl ? resolve(window.maplibregl) : reject(new Error("MapLibre no disponible"));
      script.onerror = () => reject(new Error("No se pudo cargar MapLibre"));
      document.head.appendChild(script);
    });
  }
  return mapLibreLoader;
}

const icons: Record<string, string> = { penya: "★", actuacion: "♪", evento: "●", recinto: "◆", servicio: "+" };
const esc = (s: string) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

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
  const [mapReady, setMapReady] = useState(false);
  const map = useRef<any>(null);
  const mapApi = useRef<MapLibreApi | null>(null);
  const markers = useRef<Record<string, any>>({});
  const lastFocusedId = useRef<string | null>(null);
  const pickMarker = useRef<any>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const penyaClickRef = useRef(onPenyaClick);
  penyaClickRef.current = onPenyaClick;
  const itemClickRef = useRef(onItemClick);
  itemClickRef.current = onItemClick;

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    loadMapLibre().then((api) => {
      if (cancelled || !el.current || map.current) return;
      mapApi.current = api;
      const instance = new api.Map({
        container: el.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [-0.103, 38.581],
        zoom: 15.6,
        pitch: 55,
        bearing: -12,
        maxPitch: 72,
        minZoom: 12,
        maxZoom: 20,
        antialias: true,
        attributionControl: { compact: false },
        canvasContextAttributes: { antialias: true },
      });
      map.current = instance;
      instance.addControl(new api.NavigationControl({ visualizePitch: true }), "top-right");
      instance.on("load", () => {
        if (cancelled || !map.current) return;
        if (!instance.getSource("festalfas-buildings")) {
          instance.addSource("festalfas-buildings", { type: "vector", url: "https://tiles.openfreemap.org/planet" });
        }
        const labelLayer = instance.getStyle().layers?.find((layer: any) => layer.type === "symbol" && layer.layout?.["text-field"])?.id;
        if (!instance.getLayer("festalfas-3d-buildings")) {
          instance.addLayer({
            id: "festalfas-3d-buildings",
            source: "festalfas-buildings",
            "source-layer": "building",
            type: "fill-extrusion",
            minzoom: 14,
            filter: ["!=", ["get", "hide_3d"], true],
            paint: {
              "fill-extrusion-color": ["interpolate", ["linear"], ["get", "render_height"], 0, "#e8e4dc", 12, "#c8c5bd", 40, "#aaa99f"],
              "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 14, 0, 15, ["coalesce", ["get", "render_height"], 7]],
              "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
              "fill-extrusion-opacity": 0.92,
              "fill-extrusion-vertical-gradient": true,
            },
          }, labelLayer);
        }
        setMapReady(true);
      });
      instance.on("click", (event: any) => pickRef.current?.(event.lngLat.lat, event.lngLat.lng));
      resizeObserver = new ResizeObserver(() => requestAnimationFrame(() => map.current?.resize()));
      resizeObserver.observe(el.current);
    }).catch((error) => {
      console.error("No se pudo iniciar el mapa 3D de FestAlfàs", error);
      if (el.current && !cancelled) el.current.innerHTML = '<div class="flex h-full items-center justify-center rounded-2xl bg-[#eaf0ef] p-5 text-center text-sm font-semibold text-[#52666b]">No se ha podido cargar el mapa. Comprueba tu conexión e inténtalo de nuevo.</div>';
    });
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      map.current?.remove();
      map.current = null;
      mapApi.current = null;
      markers.current = {};
      pickMarker.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    const api = mapApi.current;
    if (!mapReady || !instance || !api || !instance.isStyleLoaded()) return;
    Object.values(markers.current).forEach((marker) => marker.remove());
    markers.current = {};
    lugares.forEach((l) => {
      const markerHtml = l.categoria === "penya" && l.foto
        ? `<div class="fest-pin fest-pin-penya fest-pin-photo" style="width:50px;height:50px;box-sizing:border-box;overflow:hidden;border-radius:50%;border:3px solid #fff;background:#e6b6c7;box-shadow:0 2px 8px rgba(0,0,0,.35);padding:0;display:block;"><img src="${esc(l.foto)}" alt="" loading="lazy" referrerpolicy="no-referrer" style="display:block;width:100%;height:100%;object-fit:cover;border:0;border-radius:50%;margin:0;padding:0;" /></div>`
        : `<div class="fest-pin fest-pin-${esc(l.categoria)}">${icons[l.categoria] || "•"}</div>`;
      const element = document.createElement("div");
      element.className = "festalfas-map-marker";
      element.innerHTML = markerHtml;
      const marker = new api.Marker({ element, anchor: "center" }).setLngLat([l.lng, l.lat]).addTo(instance);
      if (l.categoria === "penya") {
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          penyaClickRef.current?.(l.id);
        });
        element.addEventListener("mouseenter", () => { marker.setOffset([0, -2]); element.style.zIndex = "20"; element.style.filter = "drop-shadow(0 5px 8px rgba(0,0,0,.35))"; });
        element.addEventListener("mouseleave", () => { marker.setOffset([0, 0]); element.style.zIndex = ""; element.style.filter = ""; });
      } else {
        const categoryLabel: Record<string, string> = { actuacion: "Actuación", evento: "Evento", recinto: "Recinto", servicio: "Servicio" };
        const popupHtml = `${l.foto ? `<img src="${esc(l.foto)}" alt="" style="width:180px;height:110px;object-fit:cover;border-radius:10px;margin-bottom:6px"/>` : ""}<small>${categoryLabel[l.categoria] || "Punto de interés"}</small><br/><strong>${esc(l.nombre)}</strong>${l.descripcion ? `<br/><span>${esc(l.descripcion)}</span>` : ""}${l.dia ? `<br/><small>${esc(l.dia)}${l.hora ? " · " + esc(l.hora) : ""}</small>` : ""}${l.detalleId ? `<br/><button type="button" data-detail-id="${esc(l.detalleId)}" class="fest-popup-detail">Ver actividad</button>` : ""}`;
        const popup = new api.Popup({ offset: 18, closeButton: true, maxWidth: "280px" }).setHTML(popupHtml);
        marker.setPopup(popup);
        popup.on("open", () => {
          const button = popup.getElement()?.querySelector<HTMLButtonElement>("[data-detail-id]");
          button?.addEventListener("click", () => itemClickRef.current?.(l.detalleId!));
        });
      }
      markers.current[l.id] = marker;
    });
  }, [lugares, mapReady]);

  useEffect(() => {
    const instance = map.current;
    const api = mapApi.current;
    if (!mapReady || !instance || !api) return;
    if (!pick) {
      pickMarker.current?.remove();
      pickMarker.current = null;
      return;
    }
    if (!pickMarker.current) {
      const element = document.createElement("div");
      element.innerHTML = '<div class="fest-pin fest-pin-penya">★</div>';
      pickMarker.current = new api.Marker({ element, anchor: "center" }).setLngLat([pick.lng, pick.lat]).addTo(instance);
    } else pickMarker.current.setLngLat([pick.lng, pick.lat]);
    instance.easeTo({ center: [pick.lng, pick.lat], duration: 450 });
  }, [pick, mapReady]);

  useEffect(() => {
    const instance = map.current;
    if (!focusId) {
      lastFocusedId.current = null;
      return;
    }
    if (!mapReady || !instance || lastFocusedId.current === focusId) return;
    const marker = markers.current[focusId];
    if (!marker) return;
    lastFocusedId.current = focusId;
    instance.stop();
    instance.easeTo({ center: marker.getLngLat(), zoom: 17, pitch: 58, duration: 650 });
    marker.togglePopup?.();
  }, [focusId, lugares, mapReady]);

  return <div ref={el} className="h-full w-full" />;
}
