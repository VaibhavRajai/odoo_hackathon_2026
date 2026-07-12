"use client";

import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const HARDCODED_COORDS: Record<string, [number, number]> = {
  "GANDHINAGAR DEPOT": [23.2156, 72.6369],
  "AHMEDABAD HUB": [23.0225, 72.5714],
  "VADODARA YARD": [22.3072, 73.1812],
  "SURAT TERMINAL": [21.1702, 72.8311],
};

const geocodeCache = new Map<string, [number, number]>();
for (const [k, v] of Object.entries(HARDCODED_COORDS)) {
  geocodeCache.set(k, v);
}

async function geocode(location: string): Promise<[number, number] | null> {
  const key = location.trim().toUpperCase();
  const cached = geocodeCache.get(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1&countrycodes=in`
    );
    const data = await res.json();
    if (data && data.length > 0) {
      const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      geocodeCache.set(key, coords);
      return coords;
    }
    geocodeCache.set(key, null as unknown as [number, number]);
  } catch {
    console.warn("Geocoding failed for:", location);
  }
  return null;
}

function dotIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function driverLabelIcon(color: string, driverName: string) {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:1px">
      <div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4)"></div>
      <span style="font-size:9px;font-weight:600;color:#1a1a1a;background:rgba(255,255,255,0.92);padding:0 5px;border-radius:3px;white-space:nowrap;max-width:90px;overflow:hidden;text-overflow:ellipsis">${driverName}</span>
    </div>`,
    iconSize: [14, 26],
    iconAnchor: [7, 26],
  });
}

const SOURCE_ICON = dotIcon("#10b981");
const DEST_ICON = dotIcon("#ef4444");

export interface MappableTrip {
  id: string;
  source: string;
  destination: string;
  driver: { id: string; name: string };
  vehicle: { registrationNumber: string };
  status: string;
}

interface Plottable {
  trip: MappableTrip;
  from: [number, number];
  to: [number, number];
}

export default function TripMap({
  trips,
  selectedDriverId,
}: {
  trips: MappableTrip[];
  selectedDriverId?: string | null;
}) {
  const [plottable, setPlottable] = useState<Plottable[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCount, setErrorCount] = useState(0);
  const cancelRef = useRef(false);

  useEffect(() => {
    cancelRef.current = false;
    setLoading(true);
    setErrorCount(0);

    Promise.all(
      trips.map(async (trip) => {
        const [from, to] = await Promise.all([geocode(trip.source), geocode(trip.destination)]);
        return { trip, from, to };
      })
    ).then((results) => {
      if (cancelRef.current) return;
      const valid = results.filter((r): r is Plottable => !!r.from && !!r.to);
      setPlottable(valid);
      setErrorCount(trips.length - valid.length);
      setLoading(false);
    });

    return () => {
      cancelRef.current = true;
    };
  }, [trips]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-zinc-400">
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <span>Resolving locations…</span>
        </div>
      </div>
    );
  }

  const displayTrips = selectedDriverId
    ? plottable.filter((p) => p.trip.driver.id === selectedDriverId)
    : plottable;

  const center: [number, number] = displayTrips[0]?.from || plottable[0]?.from || [22.5, 72.9];

  return (
    <div className="relative h-full w-full">
      {errorCount > 0 && (
        <div className="absolute top-2 left-2 z-[1000] rounded-lg bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300 shadow-md">
          {errorCount} trip{errorCount > 1 ? "s" : ""} couldn&apos;t be located on the map.
        </div>
      )}
      <MapContainer center={center} zoom={8} scrollWheelZoom={false} className="h-full w-full rounded-2xl">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {displayTrips.map(({ trip, from, to }) => (
          <React.Fragment key={trip.id}>
            <Polyline
              positions={[from, to]}
              pathOptions={{
                color: selectedDriverId ? "#2563eb" : "#3b82f6",
                weight: selectedDriverId ? 4 : 3,
                dashArray: trip.status === "DISPATCHED" ? undefined : "6 6",
              }}
            />
            <Marker position={from} icon={driverLabelIcon("#10b981", trip.driver.name)}>
              <Popup>
                <strong>{trip.source}</strong> (source)<br />
                {trip.driver.name} &middot; {trip.vehicle.registrationNumber}
              </Popup>
            </Marker>
            <Marker position={to} icon={DEST_ICON}>
              <Popup>
                <strong>{trip.destination}</strong> (destination)<br />
                {trip.driver.name} &middot; {trip.vehicle.registrationNumber}
              </Popup>
            </Marker>
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
}
