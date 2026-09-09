'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useDrishtiStore } from '@/lib/store';
import { initSync } from '@/lib/sync';
import { Hazard } from '@/lib/types';
import { AlertTriangle, Users, Truck, Signal, Clock } from 'lucide-react';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const hazardColors: Record<string, string> = { accident: '#ef4444', waterlogging: '#f59e0b', blockage: '#f59e0b', rally: '#8b5cf6' };
const hazardIcons: Record<string, string> = { accident: '🚨', waterlogging: '🌊', blockage: '🚧', rally: '🏳️' };

// Hardcoded ambulance routes
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

export default function DashboardPage() {
  useEffect(() => { initSync(); }, []);
  const store = useDrishtiStore();
  const { hazards, intersections, zones, officers, ambulanceTrips, updateIntersection, addAmbulanceTrip, completeAmbulanceTrip, updateAmbulanceProgress } = store;

  // Stats
  const activeHazards = hazards.filter(h => h.status === 'active');
  const activeCount = activeHazards.length;
  const officersOnDuty = officers.length;
  const zonesByStatus = zones.map(z => {
    const count = hazards.filter(h => h.status === 'active' && haversineDistance(h.lat, h.lng, z.lat, z.lng) <= z.radius).length;
    return { zone: z, status: count >= 3 ? 'major' : count >= 1 ? 'minor' : 'clear', count };
  });
  const clearZones = zonesByStatus.filter(z => z.status === 'clear').length;
  const minorZones = zonesByStatus.filter(z => z.status === 'minor').length;
  const majorZones = zonesByStatus.filter(z => z.status === 'major').length;
  const ambulancesInTransit = ambulanceTrips.filter(t => t.status === 'active').length;

  // Dispatch control
  const [selectedRoute, setSelectedRoute] = useState(AMBULANCE_ROUTES[0]);
  const [isDispatching, setIsDispatching] = useState(false);
  const activeTripIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const activeTripOverrides = useRef<Map<string, { intersectionId: string, timeoutId: NodeJS.Timeout }>>(new Map());

  const handleDispatch = () => {
    const trip = {
      from: selectedRoute.from,
      to: selectedRoute.to,
      waypoints: selectedRoute.waypoints,
      currentIndex: 0,
      status: 'active' as const,
    };
    addAmbulanceTrip(trip);
    setIsDispatching(true);
  };

  // Animation and override logic
  useEffect(() => {
    const trips = ambulanceTrips.filter(t => t.status === 'active');
    trips.forEach(trip => {
      if (!activeTripIntervals.current.has(trip.id)) {
        const interval = setInterval(() => {
          const currentTrip = ambulanceTrips.find(t => t.id === trip.id);
          if (!currentTrip || currentTrip.status === 'completed') {
            clearInterval(interval);
            activeTripIntervals.current.delete(trip.id);
            return;
          }
          let newIndex = currentTrip.currentIndex + 1;
          if (newIndex >= currentTrip.waypoints.length) {
            completeAmbulanceTrip(trip.id);
            clearInterval(interval);
            activeTripIntervals.current.delete(trip.id);
            // Clear override
            const override = activeTripOverrides.current.get(trip.id);
            if (override) {
              clearTimeout(override.timeoutId);
              updateIntersection(override.intersectionId, { ambulanceOverride: false, displayMessage: null });
              activeTripOverrides.current.delete(trip.id);
            }
            return;
          }
          updateAmbulanceProgress(trip.id, newIndex);
          const pos = currentTrip.waypoints[newIndex];
          if (pos) {
            const nearIntersection = intersections.find(inter => haversineDistance(pos.lat, pos.lng, inter.lat, inter.lng) < 150);
            if (nearIntersection) {
              updateIntersection(nearIntersection.id, { ambulanceOverride: true, displayMessage: 'Ambulance priority — hold' });
              const timeoutId = setTimeout(() => {
                updateIntersection(nearIntersection.id, { ambulanceOverride: false, displayMessage: null });
                activeTripOverrides.current.delete(trip.id);
              }, 6000);
              activeTripOverrides.current.set(trip.id, { intersectionId: nearIntersection.id, timeoutId });
            }
          }
        }, 500);
        activeTripIntervals.current.set(trip.id, interval);
      }
    });
    // Cleanup completed/removed
    activeTripIntervals.current.forEach((interval, id) => {
      if (!ambulanceTrips.find(t => t.id === id && t.status === 'active')) {
        clearInterval(interval);
        activeTripIntervals.current.delete(id);
      }
    });
    return () => {
      activeTripIntervals.current.forEach(clearInterval);
      activeTripOverrides.current.forEach(override => clearTimeout(override.timeoutId));
    };
  }, [ambulanceTrips, intersections, updateIntersection, completeAmbulanceTrip, updateAmbulanceProgress]);

  // Events ticker
  const events = [...hazards].sort((a,b) => b.updatedAt - a.updatedAt).slice(0,10).map(h => {
    const action = h.status === 'active' && h.reportedBy !== 'citizen' ? 'confirmed' : h.status === 'resolved' ? 'resolved' : 'reported';
    const actor = h.reportedBy === 'citizen' ? 'Citizen' : h.reportedBy === 'officer' ? 'Officer' : 'Control';
    const timeAgo = Math.floor((Date.now() - h.updatedAt) / 60000);
    return { id: h.id, text: `${actor} ${action} ${h.type}${h.description ? ' — ' + h.description : ''}`, time: timeAgo < 1 ? 'Just now' : `${timeAgo}m ago` };
  });

  return (
    <div className="min-h-screen bg-[#0b1120] text-white flex flex-col">
      {/* Top stat strip */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#141e33] border-b border-slate-700/50">
        <div className="flex items-center gap-6 text-sm flex-wrap">
          <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /><span className="text-slate-300">Active:</span><span className="font-bold text-red-400">{activeCount}</span></div>
          <div className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" /><span className="text-slate-300">Officers:</span><span className="font-bold text-blue-400">{officersOnDuty}</span></div>
          <div className="flex items-center gap-2"><div className="flex gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span><span className="text-slate-300">{clearZones}</span><span className="w-3 h-3 rounded-full bg-amber-400 ml-1"></span><span className="text-slate-300">{minorZones}</span><span className="w-3 h-3 rounded-full bg-red-500 ml-1"></span><span className="text-slate-300">{majorZones}</span></div></div>
          <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-green-500" /><span className="text-slate-300">Ambulances:</span><span className="font-bold text-green-400">{ambulancesInTransit}</span></div>
          {/* Dispatch controls */}
          <div className="flex items-center gap-2 ml-4 border-l border-slate-700 pl-4">
            <select value={selectedRoute.id} onChange={(e) => setSelectedRoute(AMBULANCE_ROUTES.find(r => r.id === e.target.value) || AMBULANCE_ROUTES[0])} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs">
              {AMBULANCE_ROUTES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button onClick={handleDispatch} className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs font-medium transition">Dispatch</button>
          </div>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>LIVE</div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <MapContainer center={[12.9716, 77.5946]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <TileLayer attribution='© OpenStreetMap' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            {zones.map(z => {
              const status = zonesByStatus.find(zs => zs.zone.id === z.id)?.status || 'clear';
              const color = status === 'clear' ? '#10b981' : status === 'minor' ? '#f59e0b' : '#ef4444';
              return <Circle key={z.id} center={[z.lat, z.lng]} radius={z.radius} pathOptions={{ color, fillColor: color, fillOpacity: 0.1, weight: 2, dashArray: '5,5' }} />;
            })}
            {hazards.filter(h => h.status === 'active' || h.status === 'unconfirmed').map(h => {
              const color = hazardColors[h.type] || '#f59e0b';
              const iconHtml = hazardIcons[h.type] || '⚠️';
              const icon = L.divIcon({
                html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:16px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${iconHtml}</div>`,
                iconSize: [28, 28], iconAnchor: [14, 14]
              });
              return <Marker key={h.id} position={[h.lat, h.lng]} icon={icon}><Popup><b>{h.type}</b><br/>{h.description}</Popup></Marker>;
            })}
            {officers.map(o => {
              const zone = zones.find(z => z.id === o.zoneId);
              if (!zone) return null;
              const icon = L.divIcon({ html: '<div style="background:#3b82f6;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:14px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">👮</div>', iconSize: [24,24], iconAnchor: [12,12] });
              return <Marker key={o.id} position={[zone.lat, zone.lng]} icon={icon}><Popup>{o.name} · {zone.name}</Popup></Marker>;
            })}
            {ambulanceTrips.filter(t => t.status === 'active').map(t => {
              const pos = t.waypoints[t.currentIndex] || t.from;
              const icon = L.divIcon({ html: '<div style="background:#dc2626;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:16px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">🚑</div>', iconSize: [28,28], iconAnchor: [14,14] });
              return <Marker key={t.id} position={[pos.lat, pos.lng]} icon={icon}><Popup>Ambulance {t.id}</Popup></Marker>;
            })}
            {ambulanceTrips.filter(t => t.status === 'active').map(t => {
              const points = t.waypoints.map(w => [w.lat, w.lng] as [number, number]);
              return <Polyline key={t.id} positions={points} color="#dc2626" weight={3} opacity={0.6} dashArray="6, 6" />;
            })}
          </MapContainer>
        </div>

        {/* Intersection sidebar */}
        <div className="w-96 bg-[#141e33] border-l border-slate-700/50 flex flex-col">
          <div className="px-4 py-3 border-b border-slate-700/50 flex items-center gap-2"><Signal className="w-5 h-5 text-amber-400" /><span className="font-semibold">Intersections</span><span className="text-xs text-slate-400 ml-auto">{intersections.length}</span></div>
          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {intersections.map(inter => {
              const total = inter.laneCounts.reduce((a,b) => a+b, 0);
              return (
                <div key={inter.id} className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
                  <div className="flex justify-between items-center mb-1"><span className="font-medium text-sm text-slate-200">{inter.name}</span><span className="text-xs text-slate-400">{total} veh</span></div>
                  <div className="flex items-center gap-2 mt-1">
                    {inter.laneCounts.map((count, idx) => {
                      const isGreen = idx === inter.greenLaneIndex;
                      const maxCount = Math.max(...inter.laneCounts, 1);
                      const width = (count / maxCount) * 100;
                      return <div key={idx} className="flex-1 flex flex-col items-center"><div className="w-full h-1.5 bg-slate-600 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-300 ${isGreen ? 'bg-green-500' : 'bg-slate-400'}`} style={{width: `${width}%`}} /></div><span className="text-[10px] text-slate-400 mt-0.5">{count}</span></div>;
                    })}
                  </div>
                  <div className="flex justify-between items-center mt-1.5 text-xs">
                    <span className="text-slate-400">Green lane: <span className="text-green-400 font-medium">Lane {inter.greenLaneIndex + 1}</span></span>
                    <span className="flex items-center gap-1 text-amber-400"><Clock className="w-3 h-3" />{inter.greenSeconds}s</span>
                  </div>
                  {inter.displayMessage && <div className="mt-1 text-xs text-yellow-400 border-t border-slate-700 pt-1">📢 {inter.displayMessage}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Events ticker */}
      <div className="bg-[#0b1120] border-t border-slate-700/50 px-4 py-2 overflow-hidden">
        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-400 font-medium whitespace-nowrap">📋 Recent events</span>
          <div className="flex-1 overflow-hidden">
            <div className="flex gap-6 animate-scroll whitespace-nowrap">
              {events.map(e => <span key={e.id} className="text-slate-300">{e.text} <span className="text-slate-500">{e.time}</span></span>)}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-scroll { animation: scroll 20s linear infinite; }
      `}</style>
    </div>
  );
}
