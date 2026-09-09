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
    showToast(`🌊 Flood reported at ${inter
