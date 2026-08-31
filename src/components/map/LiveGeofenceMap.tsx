'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Errand, ErrandLocation } from '@/types/errand';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants/map';

// User position marker icon (Blue dot)
const userIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `<div class="relative flex items-center justify-center">
    <span class="absolute h-6 w-6 rounded-full bg-blue-500/40 animate-ping"></span>
    <div class="h-4 w-4 rounded-full bg-blue-600 border-2 border-white shadow-lg"></div>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Errand marker icon (Red/Amber pin)
const errandIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface LiveGeofenceMapProps {
  userLocation: { lat: number; lng: number } | null;
  errands: Errand[];
  selectedErrandId?: string | null;
  onSelectErrand?: (errand: Errand) => void;
  isSimulating: boolean;
  onSimulateClick?: (lat: number, lng: number) => void;
}

// Map Click Listener for Dev Location Simulation
function MapClickListener({
  isSimulating,
  onSimulateClick,
}: {
  isSimulating: boolean;
  onSimulateClick?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (isSimulating && onSimulateClick) {
        onSimulateClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export function LiveGeofenceMap({
  userLocation,
  errands,
  selectedErrandId,
  onSelectErrand,
  isSimulating,
  onSimulateClick,
}: LiveGeofenceMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-[360px] sm:h-[420px] w-full items-center justify-center rounded-2xl bg-slate-900 text-xs text-slate-400 border">
        Loading live geofence map...
      </div>
    );
  }

  // Priority for map center:
  // 1. Live/simulated user position
  // 2. First active errand position
  // 3. Fallback default: MICA Campus, Shela, Ahmedabad (22.99904369488419, 72.44197827249556)
  const firstLoc = errands[0]?.locations?.[0];
  const defaultCenter: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : firstLoc
    ? [firstLoc.lat, firstLoc.lng]
    : [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng];

  return (
    <div className="relative h-[360px] sm:h-[420px] w-full overflow-hidden rounded-2xl border border-border shadow-lg">
      <MapContainer
        center={defaultCenter}
        zoom={DEFAULT_MAP_ZOOM}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', zIndex: 10 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickListener isSimulating={isSimulating} onSimulateClick={onSimulateClick} />

        {/* Live / Simulated User Location Marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>
              <div className="text-xs font-semibold">
                {isSimulating ? '🧪 Simulated Location' : '📍 Live Position'}
                <br />
                <span className="text-[10px] text-muted-foreground font-normal">
                  {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Render ALL locations for all active errands */}
        {errands.map((errand) => {
          const isSelected = selectedErrandId === errand.id;
          const locs: ErrandLocation[] = errand.locations && errand.locations.length > 0
            ? errand.locations
            : [
                {
                  lat: errand.lat ?? DEFAULT_MAP_CENTER.lat,
                  lng: errand.lng ?? DEFAULT_MAP_CENTER.lng,
                  radius_m: errand.radius_m ?? 100,
                  label: null,
                },
              ];

          return locs.map((loc, lIdx) => {
            const pos: [number, number] = [loc.lat, loc.lng];
            return (
              <React.Fragment key={`${errand.id}-${lIdx}`}>
                {/* Circle overlay showing radius */}
                <Circle
                  center={pos}
                  radius={loc.radius_m || 100}
                  pathOptions={{
                    color: isSelected ? '#ef4444' : '#3b82f6',
                    fillColor: isSelected ? '#ef4444' : '#3b82f6',
                    fillOpacity: isSelected ? 0.35 : 0.2,
                    weight: isSelected ? 3 : 2,
                  }}
                />

                {/* Marker pin */}
                <Marker
                  position={pos}
                  icon={errandIcon}
                  eventHandlers={{
                    click: () => onSelectErrand && onSelectErrand(errand),
                  }}
                >
                  <Popup>
                    <div className="text-xs space-y-1">
                      <span className="font-bold text-foreground block">
                        {loc.label ? `${loc.label} (${errand.title})` : errand.title}
                      </span>
                      {errand.note && <p className="text-[11px] text-muted-foreground">{errand.note}</p>}
                      <span className="text-[10px] font-semibold text-primary block">
                        Geofence Radius: {loc.radius_m}m
                      </span>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          });
        })}
      </MapContainer>

      {isSimulating && (
        <div className="absolute top-2 left-2 z-[400] rounded-xl bg-amber-500/90 text-amber-950 px-3 py-1.5 text-xs font-bold shadow-md backdrop-blur border border-amber-400 animate-pulse">
          🧪 Dev Simulation Active: Click anywhere on the map to set user position!
        </div>
      )}
    </div>
  );
}
