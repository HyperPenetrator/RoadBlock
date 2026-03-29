import React, { useEffect, useRef } from 'react';

declare const L: any;

interface InteractiveMapProps {
  currentLocation: [number, number];
  destinationCoords: [number, number] | null;
  route: [number, number][] | null;
  currentHeading?: number;
  currentVelocity?: number;
  onMapClick?: (latlng: [number, number]) => void;
  className?: string;
}

const ATTRIBUTION_SUPPRESSOR = `
  .leaflet-control-attribution,
  .leaflet-control-zoom,
  .leaflet-control-container { display: none !important; }
`;

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  currentLocation,
  destinationCoords,
  route,
  currentHeading = 0,
  currentVelocity = 0,
  onMapClick,
  className,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const originMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const targetPolylineRef = useRef<any>(null);
  const isUserPanning = useRef(false);
  const panTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCoords = useRef<[number, number]>(currentLocation);
  const rafIdRef = useRef<number | null>(null);

  // 60fps interpolation loop
  useEffect(() => {
    if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    const start = performance.now();
    const DURATION = 900;
    const [sLat, sLng] = prevCoords.current;
    const [eLat, eLng] = currentLocation;

    const tick = (now: number) => {
      const p = Math.min((now - start) / DURATION, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      const lat = sLat + (eLat - sLat) * ease;
      const lng = sLng + (eLng - sLng) * ease;

      if (originMarkerRef.current) {
        originMarkerRef.current.setLatLng([lat, lng]);
        const el = originMarkerRef.current.getElement();
        if (el) {
          const inner = el.querySelector('[data-heading-div]') as HTMLElement | null;
          if (inner) inner.style.transform = `rotate(${currentHeading}deg)`;
        }
      }

      if (destinationCoords && targetPolylineRef.current) {
        targetPolylineRef.current.setLatLngs([[lat, lng], destinationCoords]);
      }

      if (!isUserPanning.current && mapRef.current) {
        const offset = currentVelocity > 30 ? -0.0005 : 0;
        mapRef.current.panTo([lat + offset, lng], { animate: false });
      }

      if (p < 1) {
        rafIdRef.current = requestAnimationFrame(tick);
      } else {
        prevCoords.current = currentLocation;
        rafIdRef.current = null;
      }
    };

    rafIdRef.current = requestAnimationFrame(tick);
    return () => { if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current); };
  }, [currentLocation, currentHeading]);

  // Map init — runs once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Inject style to kill Leaflet UI chrome
    const styleEl = document.createElement('style');
    styleEl.textContent = ATTRIBUTION_SUPPRESSOR;
    document.head.appendChild(styleEl);

    mapRef.current = L.map(mapContainerRef.current, {
      center: currentLocation,
      zoom: 17,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(mapRef.current);

    mapRef.current.on('click', (e: any) => onMapClick?.([e.latlng.lat, e.latlng.lng]));

    mapRef.current.on('dragstart', () => {
      isUserPanning.current = true;
      if (panTimeoutRef.current) clearTimeout(panTimeoutRef.current);
    });
    mapRef.current.on('dragend', () => {
      panTimeoutRef.current = setTimeout(() => { isUserPanning.current = false; }, 5000);
    });

    // Rider pulse icon
    const riderIcon = L.divIcon({
      html: `
        <div style="position:relative;width:56px;height:56px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:56px;height:56px;border-radius:50%;background:rgba(0,255,209,0.12);animation:rider-pulse 1.8s ease-out infinite;"></div>
          <div style="position:absolute;width:36px;height:36px;border-radius:50%;background:rgba(0,255,209,0.08);animation:rider-pulse 1.8s ease-out infinite 0.4s;"></div>
          <div data-heading-div style="transform:rotate(0deg);transition:transform 0.5s cubic-bezier(0.175,0.885,0.32,1.275);position:relative;z-index:1;filter:drop-shadow(0 0 10px #00FFD1) drop-shadow(0 0 20px rgba(0,255,209,0.4));">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2L25 24L14 19L3 24L14 2Z" fill="#00FFD1" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-linejoin="round"/>
              <circle cx="14" cy="14" r="2" fill="white" opacity="0.8"/>
            </svg>
          </div>
        </div>
        <style>
          @keyframes rider-pulse {
            0% { transform: scale(0.8); opacity: 0.7; }
            100% { transform: scale(2.2); opacity: 0; }
          }
        </style>
      `,
      className: '',
      iconSize: [56, 56],
      iconAnchor: [28, 28],
    });

    const destIcon = L.divIcon({
      html: `<div style="width:16px;height:16px;background:#FF3D00;border:2.5px solid rgba(255,255,255,0.9);border-radius:50%;box-shadow:0 0 12px #FF3D00,0 0 24px rgba(255,61,0,0.4),0 0 0 4px rgba(255,61,0,0.15);"></div>`,
      className: '',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    originMarkerRef.current = L.marker(currentLocation, { icon: riderIcon }).addTo(mapRef.current);
    destMarkerRef.current = L.marker([0, 0], { icon: destIcon, opacity: 0 }).addTo(mapRef.current);
    targetPolylineRef.current = L.polyline([], {
      color: 'rgba(0,180,216,0.6)',
      weight: 4,
      dashArray: '6 10',
      lineCap: 'round',
    }).addTo(mapRef.current);

    return () => {
      document.head.removeChild(styleEl);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    if (destinationCoords && destMarkerRef.current) {
      destMarkerRef.current.setLatLng(destinationCoords);
      destMarkerRef.current.setOpacity(1);
    } else {
      if (destMarkerRef.current) {
        destMarkerRef.current.setOpacity(0);
      }
      if (targetPolylineRef.current) {
        targetPolylineRef.current.setLatLngs([]);
      }
    }
  }, [destinationCoords]);

  useEffect(() => {
    if (!mapRef.current) return;
    const z = currentVelocity > 60 ? 15 : currentVelocity > 20 ? 16 : 17;
    if (Math.abs(mapRef.current.getZoom() - z) >= 1) mapRef.current.setZoom(z, { animate: true });
  }, [currentVelocity]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }
    if (route && route.length > 1) {
      polylineRef.current = L.polyline(route, {
        color: '#00D1FF',
        weight: 5,
        opacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(mapRef.current);
      
      // Temporarily mark as panning to allow the map to show the full route bounds without being immediately overridden
      isUserPanning.current = true;
      mapRef.current.fitBounds(polylineRef.current.getBounds(), { padding: [80, 80], animate: true });
      
      if (panTimeoutRef.current) clearTimeout(panTimeoutRef.current);
      panTimeoutRef.current = setTimeout(() => { isUserPanning.current = false; }, 4000);
    } else {
      isUserPanning.current = false;
    }
  }, [route]);

  return (
    <div className={`relative overflow-hidden h-full w-full ${className ?? ''}`}>
      <div ref={mapContainerRef} className="absolute inset-0" style={{ zIndex: 0 }} />
    </div>
  );
};
