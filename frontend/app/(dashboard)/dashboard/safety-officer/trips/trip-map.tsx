"use client";

import React from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Trips only carry free-text source/destination (per spec — no geo columns).
 * This maps the known demo depot/hub names to coordinates so the map has
 * something real to plot. Unrecognized location names are simply skipped.
 */
const LOCATION_COORDS: Record<string, [number, number]> = {
  "GANDHINAGAR DEPOT": [23.2156, 72.6369],
  "AHMEDABAD HUB": [23.0225, 72.5714],
  "VADODARA YARD": [22.3072, 73.1812],
  "SURAT TERMINAL": [21.1702, 72.8311],
};

function coordsFor(location: string): [number, number] | null {
  return LOCATION_COORDS[location.trim().toUpperCase()] || null;
}

function dotIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

const SOURCE_ICON = dotIcon("#10b981");
const DEST_ICON = dotIcon("#ef4444");

export interface MappableTrip {
  id: string;
  source: string;
  destination: string;
  driver: { name: string };
  vehicle: { registrationNumber: string };
  status: string;
}

export default function TripMap({ trips }: { trips: MappableTrip[] }) {
  const plottable = trips
    .map((trip) => ({ trip, from: coordsFor(trip.source), to: coordsFor(trip.destination) }))
    .filter((t): t is { trip: MappableTrip; from: [number, number]; to: [number, number] } => !!t.from && !!t.to);

  const center: [number, number] = plottable[0]?.from || [22.5, 72.9];

  return (
    <MapContainer center={center} zoom={8} scrollWheelZoom={false} className="h-full w-full rounded-2xl">
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {plottable.map(({ trip, from, to }) => (
        <React.Fragment key={trip.id}>
          <Polyline positions={[from, to]} pathOptions={{ color: "#3b82f6", weight: 3, dashArray: trip.status === "DISPATCHED" ? undefined : "6 6" }} />
          <Marker position={from} icon={SOURCE_ICON}>
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
  );
}
