'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

export function LocationPickerMap({
  lat,
  lng,
  radius_m,
  onChangeLocation,
}: LocationPickerMapProps) {
  const [mounted, setMounted] = useState(false);

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

  const center: [number, number] = [lat || 37.7749, lng || -122.4194];

  return (
    <div className="relative h-60 w-full overflow-hidden rounded-xl border border-border shadow-inner">
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', zIndex: 10 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapEvents onChangeLocation={onChangeLocation} />

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

      <div className="absolute bottom-2 left-2 z-[400] rounded-lg bg-background/90 px-2 py-1 text-[11px] font-medium text-foreground shadow backdrop-blur border">
        📍 {lat.toFixed(4)}, {lng.toFixed(4)} ({radius_m}m radius)
      </div>
    </div>
  );
}
