'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ErrandLocation } from '@/types/errand';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants/map';
import { MapSearchBox } from './MapSearchBox';

// Active pin marker icon (Blue)
const activeIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Secondary pin marker icon (Violet/Gray)
const secondaryIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface MultiLocationPickerMapProps {
  locations: ErrandLocation[];
  activeLocationIndex: number;
  onSelectLocationIndex: (index: number) => void;
  onUpdateLocationCoords: (index: number, lat: number, lng: number) => void;
}

// Map Click Listener
function MapEvents({
  activeLocationIndex,
  onUpdateLocationCoords,
}: {
  activeLocationIndex: number;
  onUpdateLocationCoords: (index: number, lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onUpdateLocationCoords(activeLocationIndex, e.latlng.lat, e.latlng.lng);
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

export function MultiLocationPickerMap({
  locations,
  activeLocationIndex,
  onSelectLocationIndex,
  onUpdateLocationCoords,
}: MultiLocationPickerMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-60 w-full items-center justify-center rounded-xl bg-slate-100 border text-xs text-muted-foreground">
        Loading multi-pin map picker...
      </div>
    );
  }

  const activeLocation = locations[activeLocationIndex] || locations[0];
  const center: [number, number] = activeLocation
    ? [activeLocation.lat, activeLocation.lng]
    : [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng];

  return (
    <div className="space-y-1.5">
      {/* Search Box */}
      <MapSearchBox
        placeholder={`Search location for Pin #${activeLocationIndex + 1}...`}
        onSelectResult={(searchLat, searchLng) => {
          onUpdateLocationCoords(activeLocationIndex, searchLat, searchLng);
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

          <MapEvents
            activeLocationIndex={activeLocationIndex}
            onUpdateLocationCoords={onUpdateLocationCoords}
          />
          <MapController center={center} />

          {/* Render all location markers and radius circles */}
          {locations.map((loc, idx) => {
            const isActive = idx === activeLocationIndex;
            const pos: [number, number] = [loc.lat, loc.lng];

            return (
              <React.Fragment key={idx}>
                {/* Circle overlay showing radius */}
                <Circle
                  center={pos}
                  radius={loc.radius_m || 100}
                  pathOptions={{
                    color: isActive ? '#3b82f6' : '#8b5cf6',
                    fillColor: isActive ? '#3b82f6' : '#8b5cf6',
                    fillOpacity: isActive ? 0.3 : 0.15,
                    weight: isActive ? 3 : 2,
                  }}
                />

                {/* Marker pin */}
                <Marker
                  position={pos}
                  icon={isActive ? activeIcon : secondaryIcon}
                  eventHandlers={{
                    click: () => onSelectLocationIndex(idx),
                  }}
                />
              </React.Fragment>
            );
          })}
        </MapContainer>

        <div className="absolute bottom-2 left-2 z-[400] rounded-lg bg-background/90 px-2 py-1 text-[11px] font-medium text-foreground shadow backdrop-blur border flex items-center gap-1.5">
          <span className="flex h-2 w-2 rounded-full bg-primary" />
          Pin #{activeLocationIndex + 1}: {activeLocation.lat.toFixed(4)}, {activeLocation.lng.toFixed(4)} ({activeLocation.radius_m}m)
        </div>
      </div>
    </div>
  );
}
