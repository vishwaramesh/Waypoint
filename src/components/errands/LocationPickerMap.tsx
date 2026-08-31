'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants/map';
import { MapSearchBox } from './MapSearchBox';

// Fix default Leaflet icon paths in Next.js bundle
const customIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationPickerMapProps {
  lat: number;
  lng: number;
  radius_m: number;
  onChangeLocation: (lat: number, lng: number) => void;
}

// Map Click Handler Sub-component
function MapEvents({ onChangeLocation }: { onChangeLocation: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChangeLocation(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Map Controller Sub-component for auto panning
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, DEFAULT_MAP_ZOOM, { animate: true, duration: 1 });
  }, [center, map]);
  return null;
}

// Gates map dragging/zoom behind an explicit tap so that a swipe starting on
// the map (e.g. while scrolling a modal on mobile) passes through to the
// page's own scroll instead of being captured as a map pan.
function InteractionGate({ active }: { active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (active) {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
    } else {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
    }
  }, [active, map]);
  return null;
}

export function LocationPickerMap({
  lat,
  lng,
  radius_m,
  onChangeLocation,
}: LocationPickerMapProps) {
  const [mounted, setMounted] = useState(false);
  const [mapActive, setMapActive] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-56 w-full items-center justify-center rounded-xl bg-slate-100 border text-xs text-muted-foreground">
        Loading map picker...
      </div>
    );
  }

  const center: [number, number] = [
    lat || DEFAULT_MAP_CENTER.lat,
    lng || DEFAULT_MAP_CENTER.lng,
  ];

  return (
    <div className="space-y-1.5">
      {/* Location Search Box */}
      <MapSearchBox
        onSelectResult={(searchLat, searchLng) => {
          onChangeLocation(searchLat, searchLng);
        }}
      />

      {/* Map Container */}
      <div className="relative h-60 w-full overflow-hidden rounded-xl border border-border shadow-inner">
        <MapContainer
          center={center}
          zoom={DEFAULT_MAP_ZOOM}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', zIndex: 10 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapEvents onChangeLocation={onChangeLocation} />
          <MapController center={center} />
          <InteractionGate active={mapActive} />

          {/* Marker at selected coordinates */}
          <Marker position={center} icon={customIcon} />

          {/* Circle overlay showing radius in meters */}
          <Circle
            center={center}
            radius={radius_m || 100}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.25,
              weight: 2,
            }}
          />
        </MapContainer>

        {!mapActive && (
          <div
            onClick={() => setMapActive(true)}
            className="absolute inset-0 z-[450] flex items-center justify-center bg-background/10 active:bg-background/20 cursor-pointer"
          >
            <span className="rounded-full bg-background/95 px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-md border backdrop-blur">
              Tap map to move pin
            </span>
          </div>
        )}

        <div className="absolute bottom-2 left-2 z-[400] rounded-lg bg-background/90 px-2 py-1 text-[11px] font-medium text-foreground shadow backdrop-blur border">
          📍 {lat ? lat.toFixed(4) : DEFAULT_MAP_CENTER.lat.toFixed(4)}, {lng ? lng.toFixed(4) : DEFAULT_MAP_CENTER.lng.toFixed(4)} ({radius_m}m radius)
        </div>
      </div>
    </div>
  );
}
