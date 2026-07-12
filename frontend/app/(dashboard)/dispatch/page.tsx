"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../api-client";

interface Trip {
  id: string;
  source: string;
  destination: string;
  cargoWeight: number;
  status: string;
  vehicle: { registrationNum: string; maxLoadCapacity: number; name: string };
  driver: { name: string; licenseNumber: string };
}

interface Vehicle {
  id: string;
  registrationNum: string;
  maxLoadCapacity: number;
  name: string;
}

interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
}

export default function DispatchPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  
  const router = useRouter();
  const [showCompleteModal, setShowCompleteModal] = useState<string | null>(null); // trip id

  // Complete Trip Form State
  const [finalOdometer, setFinalOdometer] = useState("");
  const [fuelLiters, setFuelLiters] = useState("");
  const [fuelCost, setFuelCost] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      const tripsData = await apiFetch("/api/trips");
      setTrips(tripsData.data || []);

      const vehiclesData = await apiFetch("/api/vehicles/available");
      setAvailableVehicles(vehiclesData.data || []);

      const driversData = await apiFetch("/api/drivers/available");
      setAvailableDrivers(driversData.data || []);
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message || "Failed to fetch data");
      } else {
        setError("Failed to fetch data");
      }
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);



  const handleAction = async (tripId: string, action: "dispatch" | "cancel") => {
    try {
      await apiFetch(`/api/trips/${tripId}/${action}`, { method: "POST" });
      fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message || `Failed to ${action} trip`);
      } else {
        alert(`Failed to ${action} trip`);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, tripId: string) => {
    e.dataTransfer.setData("tripId", tripId);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const tripId = e.dataTransfer.getData("tripId");
    if (!tripId) return;

    const trip = trips.find(t => t.id === tripId);
    if (!trip || trip.status === newStatus) return;

    if (newStatus === 'Dispatched' && trip.status === 'Draft') {
      handleAction(tripId, 'dispatch');
    } else if (newStatus === 'Cancelled' && (trip.status === 'Draft' || trip.status === 'Dispatched')) {
      handleAction(tripId, 'cancel');
    } else if (newStatus === 'Completed' && trip.status === 'Dispatched') {
      setShowCompleteModal(tripId);
    } else {
      alert(`Invalid transition from ${trip.status} to ${newStatus}`);
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCompleteTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCompleteModal) return;
    setLoading(true);
    setError("");
    try {
      await apiFetch(`/api/trips/${showCompleteModal}/complete`, {
        method: "POST",
        body: JSON.stringify({
          finalOdometer,
          fuelLiters,
          fuelCost
        })
      });
      setShowCompleteModal(null);
      setFinalOdometer(""); setFuelLiters(""); setFuelCost("");
      fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Failed to complete trip");
      } else {
        setError("Failed to complete trip");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">Dispatch Dashboard</h1>
        <button 
          onClick={() => router.push('/dispatch/create')}
          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-300 shadow-md shadow-blue-700/20"
        >
          Create New Trip
        </button>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg mb-6 border border-red-100 dark:border-red-900/50 transition-colors duration-300">{error}</div>}

      {/* Kanban Board Layout */}
      <div className="flex gap-6 overflow-x-auto pb-4 min-h-[60vh]">
        {['Draft', 'Dispatched', 'Completed', 'Cancelled'].map((status) => (
          <div 
            key={status} 
            className="flex-1 min-w-[300px] flex flex-col bg-gray-50 dark:bg-zinc-900/50 rounded-xl border border-gray-100 dark:border-zinc-800 p-4 transition-colors hover:bg-gray-100/50 dark:hover:bg-zinc-800/30"
            onDrop={(e) => handleDrop(e, status)}
            onDragOver={handleDragOver}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wide text-xs">
                {status}
              </h2>
              <span className="bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 text-xs font-bold px-2 py-0.5 rounded-full">
                {trips.filter(t => t.status === status).length}
              </span>
            </div>
            
            <div className="flex flex-col gap-3 flex-1">
              {trips.filter(t => t.status === status).map(trip => (
                <div 
                  key={trip.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, trip.id)}
                  className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing hover:border-blue-300 dark:hover:border-blue-700/50"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-tight">
                        {trip.source} → {trip.destination}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">Cargo: {trip.cargoWeight} kg</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 px-2 py-1.5 rounded">
                      <div className="font-medium truncate">{trip.vehicle.name}</div>
                    </div>
                    <div className="flex items-center gap-2 text-sm bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-1.5 rounded">
                      <div className="font-medium truncate">{trip.driver.name}</div>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end mt-auto pt-2 border-t border-gray-100 dark:border-zinc-800">
                    {trip.status === 'Draft' && (
                      <button onClick={() => handleAction(trip.id, 'dispatch')} className="flex-1 text-xs bg-blue-600 text-white hover:bg-blue-700 py-1.5 rounded transition-colors font-semibold shadow-sm">
                        Dispatch Trip
                      </button>
                    )}
                    {trip.status === 'Dispatched' && (
                      <button onClick={() => setShowCompleteModal(trip.id)} className="flex-1 text-xs bg-green-600 text-white hover:bg-green-700 py-1.5 rounded transition-colors font-semibold shadow-sm">
                        Complete Trip
                      </button>
                    )}
                    {(trip.status === 'Draft' || trip.status === 'Dispatched') && (
                      <button onClick={() => handleAction(trip.id, 'cancel')} className="text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 px-3 py-1.5 rounded transition-colors font-medium">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {trips.filter(t => t.status === status).length === 0 && (
                <div className="text-center p-6 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-lg text-gray-400 dark:text-zinc-500 text-sm">
                  No trips here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>



      {/* Complete Trip Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-gray-100 dark:border-zinc-800 max-w-md w-full p-6 transition-colors duration-300">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Complete Trip & Log Fuel</h2>
            <form onSubmit={handleCompleteTrip} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Final Odometer Reading</label>
                <input required type="number" step="0.1" className="w-full bg-white dark:bg-zinc-950 text-gray-900 dark:text-white border border-gray-300 dark:border-zinc-700 rounded-lg p-2 focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500 focus:border-blue-700 dark:focus:border-blue-500 outline-none transition-colors duration-300" value={finalOdometer} onChange={e => setFinalOdometer(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Fuel Consumed (Liters)</label>
                  <input required type="number" step="0.1" className="w-full bg-white dark:bg-zinc-950 text-gray-900 dark:text-white border border-gray-300 dark:border-zinc-700 rounded-lg p-2 focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500 focus:border-blue-700 dark:focus:border-blue-500 outline-none transition-colors duration-300" value={fuelLiters} onChange={e => setFuelLiters(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Fuel Cost ($)</label>
                  <input required type="number" step="0.1" className="w-full bg-white dark:bg-zinc-950 text-gray-900 dark:text-white border border-gray-300 dark:border-zinc-700 rounded-lg p-2 focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500 focus:border-blue-700 dark:focus:border-blue-500 outline-none transition-colors duration-300" value={fuelCost} onChange={e => setFuelCost(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowCompleteModal(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg font-medium transition-colors duration-300">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors duration-300 disabled:opacity-50">Complete Trip</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
