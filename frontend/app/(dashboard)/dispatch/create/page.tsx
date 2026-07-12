"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../../api-client";
import { Truck, CheckCircle2, ChevronLeft, Loader2, Weight } from "lucide-react";
import { LocationInput } from "../../../../components/LocationInput";

interface Vehicle {
  id: string;
  registrationNumber: string;
  name: string;
  maxLoadCapacity: number;
}

interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
}

export default function CreateTripPage() {
  const router = useRouter();
  
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [cargoWeight, setCargoWeight] = useState("");
  const [plannedDistance, setPlannedDistance] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  
  const [loadingDistance, setLoadingDistance] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  // Animation state
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    async function loadResources() {
      try {
        const vRes = await apiFetch("/api/vehicles?status=AVAILABLE");
        if (vRes.success) setAvailableVehicles(vRes.data);
        
        const dRes = await apiFetch("/api/drivers/available");
        if (dRes.success) setAvailableDrivers(dRes.data);
      } catch (e) {
        console.error("Failed to load resources:", e);
      }
    }
    loadResources();
  }, []);

  const calculateDistance = async () => {
    if (!source || !destination) return;
    setLoadingDistance(true);
    setError("");
    try {
      // 1. Geocode Source
      const srcRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(source)}&format=json&limit=1&countrycodes=in`);
      const srcData = await srcRes.json();
      
      // 2. Geocode Destination
      const destRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1&countrycodes=in`);
      const destData = await destRes.json();

      if (!srcData.length || !destData.length) {
        throw new Error("Could not find one or both locations. Please be more specific.");
      }

      const srcLon = srcData[0].lon;
      const srcLat = srcData[0].lat;
      const destLon = destData[0].lon;
      const destLat = destData[0].lat;

      // 3. Get Distance from OSRM
      const routeRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${srcLon},${srcLat};${destLon},${destLat}?overview=false`);
      const routeData = await routeRes.json();

      if (routeData.code !== "Ok" || !routeData.routes.length) {
        throw new Error("Could not calculate a route between these locations.");
      }

      const distanceKm = (routeData.routes[0].distance / 1000).toFixed(1);
      setPlannedDistance(distanceKm.toString());
      
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to calculate distance.");
      setPlannedDistance("");
    } finally {
      setLoadingDistance(false);
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!vehicleId) return setError("Please select a vehicle.");
    if (!driverId) return setError("Please select a driver.");
    
    const selectedVehicle = availableVehicles.find(v => v.id === vehicleId);
    if (selectedVehicle && parseFloat(cargoWeight) > selectedVehicle.maxLoadCapacity) {
      return setError(`Cargo weight (${cargoWeight}kg) exceeds vehicle capacity (${selectedVehicle.maxLoadCapacity}kg).`);
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/trips", {
        method: "POST",
        body: JSON.stringify({
          source,
          destination,
          cargoWeight,
          plannedDistance,
          vehicleId,
          driverId
        })
      });

      if (res.success) {
        // Trigger amazing splash animation
        setShowSplash(true);
        setTimeout(() => {
          router.push("/dispatch");
        }, 3500);
      } else {
        throw new Error(res.message);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create trip.");
      setSubmitting(false);
    }
  };

  if (showSplash) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-blue-600 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
        
        {/* Animated Cargo Truck */}
        <div className="relative z-10 flex flex-col items-center animate-bounce-slow">
          <Truck className="w-32 h-32 text-white animate-truck-drive" />
          <h1 className="mt-8 text-4xl font-extrabold text-white tracking-tight animate-fade-in-up">
            Trip Dispatched Successfully!
          </h1>
          <p className="mt-4 text-blue-200 text-lg animate-fade-in-up delay-150">
            Cargo is on the move. Redirecting to dispatch board...
          </p>
        </div>
        
        {/* Road Animation */}
        <div className="absolute bottom-0 w-full h-32 bg-zinc-900 border-t-4 border-dashed border-yellow-500 animate-road-pan"></div>

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes truck-drive {
            0% { transform: translateX(-150vw) scale(0.8); }
            50% { transform: translateX(0) scale(1.1); }
            100% { transform: translateX(150vw) scale(0.8); }
          }
          @keyframes road-pan {
            0% { background-position: 0 0; }
            100% { background-position: -200px 0; }
          }
          @keyframes fade-in-up {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .animate-truck-drive {
            animation: truck-drive 3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }
          .animate-road-pan {
            animation: road-pan 0.5s linear infinite;
          }
          .animate-fade-in-up {
            animation: fade-in-up 0.8s ease-out forwards;
          }
          .delay-150 {
            animation-delay: 150ms;
          }
          .animate-bounce-slow {
            animation: bounce 2s infinite;
          }
        `}} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <button 
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center text-sm font-medium text-zinc-400 hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to Dispatch
      </button>

      <div className="py-2">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">Create New Trip</h1>
        <p className="text-gray-500 dark:text-zinc-400 mb-8">Plan a route, assign a vehicle, and dispatch your cargo.</p>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateTrip} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Source */}
            <LocationInput
              label="Source Location"
              placeholder="e.g. New York, NY"
              value={source}
              onChange={setSource}
              onSelect={calculateDistance}
              iconColor="text-blue-500"
            />

            {/* Destination */}
            <LocationInput
              label="Destination"
              placeholder="e.g. Boston, MA"
              value={destination}
              onChange={setDestination}
              onSelect={calculateDistance}
              iconColor="text-red-500"
            />

            {/* Distance (Auto) */}
            <div className="space-y-2 md:col-span-2 bg-gray-50 dark:bg-zinc-900 p-4 rounded-lg border border-gray-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-zinc-400">Planned Distance</label>
                <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {loadingDistance ? (
                    <span className="flex items-center text-blue-400 text-sm"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Calculating via OSRM...</span>
                  ) : plannedDistance ? (
                    `${plannedDistance} km`
                  ) : (
                    <span className="text-gray-400 dark:text-zinc-600 text-base font-normal">Enter locations to calculate</span>
                  )}
                </div>
              </div>
            </div>

            {/* Cargo Weight */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-zinc-300">
                <Weight className="w-4 h-4 mr-2 text-emerald-500" /> Cargo Weight (kg)
              </label>
              <input 
                required 
                type="number" 
                placeholder="Enter weight in kg"
                className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none shadow-sm"
                value={cargoWeight} 
                onChange={e => setCargoWeight(e.target.value)}
              />
            </div>

            {/* Assign Vehicle */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-zinc-300">
                <Truck className="w-4 h-4 mr-2 text-amber-500" /> Assign Vehicle
              </label>
              <select 
                required 
                className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none appearance-none shadow-sm"
                value={vehicleId} 
                onChange={e => setVehicleId(e.target.value)}
              >
                <option value="">Select a vehicle</option>
                {availableVehicles.map(v => {
                  const isOverweight = parseFloat(cargoWeight || "0") > v.maxLoadCapacity;
                  return (
                    <option key={v.id} value={v.id} disabled={isOverweight}>
                      {v.name} ({v.registrationNumber}) - Max: {v.maxLoadCapacity}kg {isOverweight ? '(Capacity Exceeded)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Assign Driver */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Assign Driver</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableDrivers.length === 0 ? (
                  <div className="col-span-full p-4 border border-gray-200 dark:border-zinc-800 rounded-lg text-gray-500 dark:text-zinc-500 text-center bg-gray-50 dark:bg-zinc-900">
                    No drivers available.
                  </div>
                ) : availableDrivers.map(d => (
                  <div 
                    key={d.id}
                    onClick={() => setDriverId(d.id)}
                    className={`cursor-pointer border rounded-xl p-4 transition-all ${
                      driverId === d.id 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' 
                        : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-gray-300 dark:hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-900 dark:text-white">{d.name}</div>
                      {driverId === d.id && <CheckCircle2 className="w-5 h-5 text-blue-500" />}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-zinc-500 mt-1">License: {d.licenseNumber}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200 dark:border-zinc-800 flex justify-end">
            <button 
              type="submit" 
              disabled={submitting || loadingDistance}
              className="inline-flex items-center justify-center px-8 py-3.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-500 focus:ring-4 focus:ring-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
            >
              {submitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Dispatching...</> : 'Dispatch Cargo Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
