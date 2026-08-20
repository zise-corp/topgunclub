'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Icon from '@/components/Icon';
import { COCHABAMBA_CENTER, isValidMapsUrl, mapsUrlFromCoords } from '@/lib/delivery';

// ─────────────────────────────────────────────────────────────────────────────
// Ubicación para envíos en Cochabamba. Dos formas, excluyentes entre sí —
// gana la última usada: (a) marcar en el mapa (pin arrastrable, GPS o
// coordenadas escritas a mano) o (b) pegar un link de Google Maps.
// ─────────────────────────────────────────────────────────────────────────────

export interface LocationValue {
  lat: number | null;
  lng: number | null;
  mapsUrl: string;
}

interface Props {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
}

// Leaflet resuelve el ícono por CSS relativo al bundle; en Next se rompe, así
// que dibujamos el pin como un divIcon con el dorado de la marca.
const PIN_ICON = L.divIcon({
  className: '',
  html: `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0C6.7 0 0 6.7 0 15c0 11 15 27 15 27s15-16 15-27C30 6.7 23.3 0 15 0z" fill="#C99E66"/>
    <circle cx="15" cy="15" r="6" fill="#0A0A0A"/>
  </svg>`,
  iconSize: [30, 42],
  iconAnchor: [15, 42],
});

export default function LocationPicker({ value, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [urlError, setUrlError] = useState('');
  const [coordError, setCoordError] = useState('');
  // Texto de los campos: separado del valor numérico para no pelear con lo
  // que el usuario está tecleando (ej. "-17." todavía no es un número válido).
  const [coordText, setCoordText] = useState({ lat: '', lng: '' });
  const [urlText, setUrlText] = useState('');

  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  /** Marca un punto (mapa/GPS): descarta el link pegado — gana lo último usado. */
  const setPoint = useCallback((lat: number, lng: number) => {
    setCoordText({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
    setUrlText('');
    setGeoError('');
    setUrlError('');
    setCoordError('');
    onChangeRef.current({ lat, lng, mapsUrl: mapsUrlFromCoords(lat, lng) });
  }, []);

  // Monta el mapa UNA sola vez. Sin deps: incluir value.lat/lng haría que el
  // cleanup destruyera y recreara el mapa en cada movimiento del pin.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      attributionControl: false,
      // El drawer scrollea; sin esto la rueda haría zoom en el mapa en vez de
      // scrollear el formulario. Se sigue pudiendo hacer zoom con +/− y pinch.
      scrollWheelZoom: false,
    }).setView([COCHABAMBA_CENTER.lat, COCHABAMBA_CENTER.lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const marker = L.marker([COCHABAMBA_CENTER.lat, COCHABAMBA_CENTER.lng], {
      draggable: true,
      icon: PIN_ICON,
    }).addTo(map);

    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng();
      setPoint(lat, lng);
    });
    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      setPoint(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    // El drawer anima su apertura; sin esto el mapa calcula mal su tamaño.
    const t = setTimeout(() => map.invalidateSize(), 250);

    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [setPoint]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Tu navegador no soporta ubicación. Marcá el punto en el mapa.');
      return;
    }
    setLocating(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPoint(latitude, longitude);
        markerRef.current?.setLatLng([latitude, longitude]);
        mapRef.current?.setView([latitude, longitude], 17);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        // Mensaje según la causa real: no es lo mismo un permiso denegado que
        // un GPS sin señal, y la solución que le sugerimos cambia.
        const msg =
          err.code === err.PERMISSION_DENIED
            ? 'No diste permiso de ubicación. Podés marcar el punto tocando el mapa, o pegar un link de Google Maps.'
            : err.code === err.TIMEOUT
              ? 'Tardó demasiado en responder. Probá de nuevo o marcá el punto en el mapa.'
              : 'No pudimos obtener tu ubicación (sin señal de GPS). Marcá el punto tocando el mapa.';
        setGeoError(msg);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
    );
  };

  /** Coordenadas escritas a mano: mueven el pin y ajustan el mapa. */
  const onCoordChange = (which: 'lat' | 'lng', raw: string) => {
    const next = { ...coordText, [which]: raw };
    setCoordText(next);
    setUrlText('');
    setGeoError('');

    if (!next.lat.trim() && !next.lng.trim()) {
      setCoordError('');
      onChange({ lat: null, lng: null, mapsUrl: '' });
      return;
    }

    const lat = Number(next.lat);
    const lng = Number(next.lng);
    const valid =
      next.lat.trim() !== '' && next.lng.trim() !== '' &&
      Number.isFinite(lat) && Number.isFinite(lng) &&
      lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

    if (!valid) {
      setCoordError('Revisá las coordenadas (ej. -17.389500 / -66.156800)');
      return;
    }

    setCoordError('');
    onChange({ lat, lng, mapsUrl: mapsUrlFromCoords(lat, lng) });
    markerRef.current?.setLatLng([lat, lng]);
    mapRef.current?.setView([lat, lng], 17);
  };

  /** Link pegado: descarta el punto del mapa — gana lo último usado. */
  const onUrlChange = (raw: string) => {
    setUrlText(raw);
    setGeoError('');
    setCoordError('');

    if (!raw.trim()) {
      setUrlError('');
      onChange({ lat: null, lng: null, mapsUrl: '' });
      return;
    }
    if (!isValidMapsUrl(raw)) {
      setUrlError('Pegá un link de Google Maps válido (maps.google.com o maps.app.goo.gl)');
      onChange({ lat: null, lng: null, mapsUrl: raw });
      return;
    }
    setUrlError('');
    setCoordText({ lat: '', lng: '' });
    onChange({ lat: null, lng: null, mapsUrl: raw });
  };

  const pinned = value.lat != null && value.lng != null;
  const usingUrl = !pinned && !!value.mapsUrl.trim();

  return (
    <div className="loc-picker">
      <button type="button" className="loc-picker__geo" onClick={useMyLocation} disabled={locating}>
        <Icon name="pin" style={{ width: 16, height: 16 }} />
        {locating ? 'Buscando tu ubicación…' : 'Usar mi ubicación actual'}
      </button>

      <div ref={containerRef} className="loc-picker__map" />

      {geoError && <p className="loc-picker__err">{geoError}</p>}

      <p className="loc-picker__hint">
        {pinned
          ? '✓ Ubicación marcada. Arrastrá el pin o editá las coordenadas para ajustarla.'
          : usingUrl
            ? '✓ Usaremos el link de Google Maps que pegaste.'
            : 'Tocá el mapa o arrastrá el pin hasta tu dirección.'}
      </p>

      {/* Coordenadas: se llenan solas al marcar el mapa, y son editables */}
      <div className="loc-picker__coords">
        <label className="field">
          <span>Latitud</span>
          <input
            inputMode="decimal"
            value={coordText.lat}
            onChange={(e) => onCoordChange('lat', e.target.value)}
            placeholder="-17.389500"
          />
        </label>
        <label className="field">
          <span>Longitud</span>
          <input
            inputMode="decimal"
            value={coordText.lng}
            onChange={(e) => onCoordChange('lng', e.target.value)}
            placeholder="-66.156800"
          />
        </label>
      </div>
      {coordError && <p className="loc-picker__err">{coordError}</p>}

      <div className="loc-picker__or"><span>o</span></div>

      <label className="field">
        <span>Pegá tu link de Google Maps</span>
        <input
          value={urlText}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://maps.app.goo.gl/…"
          maxLength={2000}
        />
      </label>
      {urlError && <p className="loc-picker__err">{urlError}</p>}
    </div>
  );
}
