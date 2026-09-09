'use client';

import { useEffect, useState } from 'react';
import { useDrishtiStore } from '@/lib/store';
import { initSync } from '@/lib/sync';
import { Hazard } from '@/lib/types';

const AMBULANCE_ROUTES = [
  {
    id: 'route-1',
    name: 'St. Martha\'s → Bowring',
    from: { lat: 12.9692, lng: 77.5932 },
    to: { lat: 12.9818, lng: 77.5995 },
    waypoints: generateWaypoints({ lat: 12.9692, lng: 77.5932 }, { lat: 12.9818, lng: 77.5995 }, 8),
  },
  {
    id: 'route-2',
    name: 'Victoria Hospital → Jayadeva',
    from: { lat: 12.9632, lng: 77.6020 },
    to: { lat: 12.9270, lng: 77.5950 },
    waypoints: generateWaypoints({ lat: 12.9632, lng: 77.6020 }, { lat: 12.9270, lng: 77.5950 }, 10),
  },
];

function generateWaypoints(from: {lat: number, lng: number}, to: {lat: number, lng: number}, count: number) {
  const points = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    points.push({
      lat: from.lat + (to.lat - from.lat) * t + (Math.random() - 0.5) * 0.002,
      lng: from.lng + (to.lng - from.lng) * t + (Math.random() - 0.5) * 0.002,
    });
  }
  return points;
}

let toastTimeout: NodeJS.Timeout | null = null;

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `px-4 py-2 rounded shadow-lg text-sm font-medium ${
    type === 'success' ? 'bg-green-600 text-white' :
    type === 'error' ? 'bg-red-600 text-white' :
    'bg-blue-600 text-white'
  }`;
  toast.textContent = message;
  container.appendChild(toast);
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toast.remove(); toastTimeout = null; }, 3000);
}

export default function DemoControlPage() {
  useEffect(() => { initSync(); }, []);
  const store = useDrishtiStore();
  const { intersections, zones, addHazard, addAmbulanceTrip, resetDemo } = store;

  const handleFlood = (id: string) => {
    const inter = intersections.find(i => i.id === id);
    if (!inter) return;
    addHazard({
      type: 'waterlogging',
      lat: inter.lat,
      lng: inter.lng,
      description: `Flooding at ${inter.name}`,
      reportedBy: 'camera',
      status: 'active',
      weight: 3,
    });
    showToast(`🌊 Flood reported at ${inter.name}`, 'success');
  };

  const handleRally = (id: string) => {
    const zone = zones.find(z => z.id === id);
    if (!zone) return;
    addHazard({
      type: 'rally',
      lat: zone.lat,
      lng: zone.lng,
      description: `Rally in ${zone.name}`,
      reportedBy: 'camera',
      status: 'active',
      weight: 2,
    });
    showToast(`🏳️ Rally reported in ${zone.name}`, 'success');
  };

  const handleDispatch = (routeId: string) => {
    const route = AMBULANCE_ROUTES.find(r => r.id === routeId);
    if (!route) return;
    addAmbulanceTrip({
      from: route.from,
      to: route.to,
      waypoints: route.waypoints,
      currentIndex: 0,
      status: 'active',
    });
    showToast(`🚑 Ambulance dispatched: ${route.name}`, 'success');
  };

  const handleCitizenReport = () => {
    if (intersections.length === 0) return;
    const inter = intersections[Math.floor(Math.random() * intersections.length)];
    const types: Hazard['type'][] = ['accident', 'waterlogging', 'blockage'];
    const type = types[Math.floor(Math.random() * types.length)];
    addHazard({
      type,
      lat: inter.lat + (Math.random() - 0.5) * 0.002,
      lng: inter.lng + (Math.random() - 0.5) * 0.002,
      description: `Citizen report: ${type} near ${inter.name}`,
      reportedBy: 'citizen',
      status: 'unconfirmed',
      weight: 1,
    });
    showToast(`👤 Citizen report simulated near ${inter.name}`, 'info');
  };

  const handleReset = () => {
    resetDemo();
    showToast('🔄 Demo reset to seed state', 'error');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">🎮 DRISHTI Demo Control</h1>
        <p className="text-gray-500 mb-6">Hidden presenter panel — actions fire instantly</p>
        <div id="toast-container" className="fixed top-4 right-4 z-50 space-y-2"></div>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-gray-700">🌊 Flood (Intersection)</h2>
          <div className="flex flex-wrap gap-2">{intersections.map(i => <button key={i.id} onClick={() => handleFlood(i.id)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow text-sm transition">Flood {i.name}</button>)}</div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-gray-700">🏳️ Rally (Zone)</h2>
          <div className="flex flex-wrap gap-2">{zones.map(z => <button key={z.id} onClick={() => handleRally(z.id)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded shadow text-sm transition">Rally at {z.name}</button>)}</div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-gray-700">🚑 Dispatch Ambulance</h2>
          <div className="flex flex-wrap gap-2">{AMBULANCE_ROUTES.map(r => <button key={r.id} onClick={() => handleDispatch(r.id)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow text-sm transition">{r.name}</button>)}</div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-gray-700">👤 Simulate Citizen Report</h2>
          <button onClick={handleCitizenReport} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded shadow text-sm transition">Random citizen report</button>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-gray-700">🔄 Reset</h2>
          <button onClick={handleReset} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded shadow text-sm transition">Reset Demo</button>
        </section>

        <div className="mt-8 text-xs text-gray-400 border-t border-gray-300 pt-4">This panel is not linked from the main app — accessible only by URL.</div>
      </div>
    </div>
  );
}
