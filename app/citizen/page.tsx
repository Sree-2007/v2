'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useDrishtiStore } from '@/lib/store';
import { initSync } from '@/lib/sync';
import { Hazard } from '@/lib/types';
import { X, AlertTriangle, Locate, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Fix default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const LANDMARKS = [
  { name: 'Cubbon Park', lat: 12.9762, lng: 77.5988 },
  { name: 'UB City', lat: 12.9692, lng: 77.6050 },
  { name: 'Vidhana Soudha', lat: 12.9796, lng: 77.5900 },
  { name: 'Bangalore Palace', lat: 12.9900, lng: 77.5920 },
  { name: 'MG Road Metro Station', lat: 12.9740, lng: 77.6030 },
  { name: 'Trinity Circle', lat: 12.9716, lng: 77.5946 },
];

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1,
    dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return haversineDistance(px, py, x1, y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx,
    projY = y1 + t * dy;
  return haversineDistance(px, py, projX, projY);
}

function getAnonId() {
  let id = localStorage.getItem('drishti-anon-id');
  if (!id) { id = 'anon-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('drishti-anon-id', id); }
  return id;
}

export default function CitizenPage() {
  useEffect(() => { initSync(); }, []);
  const store = useDrishtiStore();
  const hazards = store.hazards.filter(h => h.status === 'active' || h.status === 'unconfirmed');

  const [currentPosition] = useState({ lat: 12.9716, lng: 77.5946 });
  const [destination, setDestination] = useState<typeof LANDMARKS[0] | null>(null);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [alternateRoutePoints, setAlternateRoutePoints] = useState<[number, number][]>([]);
  const [routeBanner, setRouteBanner] = useState<{ type: string; road: string } | null>(null);
  const [isRouteActive, setIsRouteActive] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [reportType, setReportType] = useState<Hazard['type']>('accident');
  const [reportDesc, setReportDesc] = useState('');
  const [reportLocation, setReportLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'warning' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const alertedHazards = useRef<Set<string>>(new Set());

  // Mount flag to prevent Leaflet "already initialized" error in Strict Mode
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Route logic (same as before)
  useEffect(() => {
    if (!destination) {
      setRoutePoints([]);
      setAlternateRoutePoints([]);
      setRouteBanner(null);
      setIsRouteActive(false);
      return;
    }
    const from = currentPosition,
      to = destination;
    const points: [number, number][] = [
      [from.lat, from.lng],
      [to.lat, to.lng]
    ];
    setRoutePoints(points);
    setIsRouteActive(true);

    let hazardFound = false,
      hazardType = '',
      roadName = '';
    for (const h of hazards) {
      if (distanceToSegment(h.lat, h.lng, from.lat, from.lng, to.lat, to.lng) < 300) {
        hazardFound = true;
        hazardType = h.type;
        roadName = getNearestRoad(h.lat, h.lng);
        const midLat = (from.lat + to.lat) / 2,
          midLng = (from.lng + to.lng) / 2;
        const dx = to.lng - from.lng,
          dy = to.lat - from.lat;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0.00001) {
          const perpX = -dy / len * 0.002,
            perpY = dx / len * 0.002;
          const hx = h.lng - midLng,
            hy = h.lat - midLat;
          const hLen = Math.sqrt(hx * hx + hy * hy);
          let offsetX = perpX,
            offsetY = perpY;
          if (hLen > 0.00001) { const pushFactor = 0.003;
            offsetX += (hx / hLen) * pushFactor;
            offsetY += (hy / hLen) * pushFactor; }
          const waypoint = { lat: midLat + offsetY, lng: midLng + offsetX };
          setAlternateRoutePoints([
            [from.lat, from.lng],
            [waypoint.lat, waypoint.lng],
            [to.lat, to.lng]
          ]);
        }
        break;
      }
    }
    if (hazardFound) setRouteBanner({ type: hazardType, road: roadName });
    else { setRouteBanner(null);
      setAlternateRoutePoints([]); }
  }, [destination, currentPosition, hazards]);

  useEffect(() => {
    if (!isRouteActive) return;
    for (const h of hazards) {
      if (haversineDistance(currentPosition.lat, currentPosition.lng, h.lat, h.lng) < 500 && !alertedHazards.current.has(h
          .id)) {
        alertedHazards.current.add(h.id);
        setToast({ message: `⚠️ Hazard ${h.type} near your route!`, type: 'warning' });
        setTimeout(() => setToast(null), 4000);
      }
    }
  }, [hazards, currentPosition, isRouteActive]);

  function getNearestRoad(lat: number, lng: number) {
    let min = Infinity,
      nearest = 'unknown road';
    for (const l of LANDMARKS) { const d = haversineDistance(lat, lng, l.lat, l.lng); if (d < min) { min = d;
        nearest = l.name; } }
    return nearest;
  }

  const handleReportSubmit = () => {
    if (!reportLocation) { setToast({ message: 'Please select a location on the map.', type: 'warning' }); return; }
    store.addHazard({
      type: reportType,
      lat: reportLocation.lat,
      lng: reportLocation.lng,
      description: reportDesc || (reportType + ' reported'),
      reportedBy: 'citizen',
      status: 'unconfirmed',
      weight: 1,
    });
    setToast({ message: 'Reported — thanks for the heads up!', type: 'success' });
    setTimeout(() => setToast(null), 3000);
    setShowReportSheet(false);
    setReportDesc('');
    setReportLocation(null);
    setReportType('accident');
  };

  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => { if (showReportSheet) { const { lat, lng } = e.latlng;
          setReportLocation({ lat, lng }); } }
    });
    return null;
  };

  const filteredLandmarks = LANDMARKS.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Map container – only rendered after mount */}
      {isMounted && (
        <MapContainer
          key="citizen-map"
          center={[12.9716, 77.5946]}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='© OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={[currentPosition.lat, currentPosition.lng]}
            icon={L.divIcon({ html: '📍', iconSize: [24, 24] })}
          >
            <Popup>Your location</Popup>
          </Marker>
          {hazards.map(h => {
            const color = h.type === 'accident' ? '#ef4444' : h.type === 'rally' ? '#8b5cf6' : '#f59e0b';
            const iconHtml = h.type === 'accident' ? '🚨' : h.type === 'rally' ? '🏳️' : '⚠️';
            const icon = L.divIcon({
              html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:16px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${iconHtml}</div>`,
              iconSize: [28, 28],
              iconAnchor: [14, 14]
            });
            return (
              <Marker key={h.id} position={[h.lat, h.lng]} icon={icon}>
                <Popup><b>{h.type}</b><br />{h.description}</Popup>
              </Marker>
            );
          })}
          {routePoints.length > 0 && (
            <Polyline positions={routePoints} color="#4f46e5" weight={4} opacity={0.8} dashArray="10, 8" />
          )}
          {alternateRoutePoints.length > 0 && (
            <Polyline positions={alternateRoutePoints} color="#f59e0b" weight={4} opacity={0.9} dashArray="6, 6" />
          )}
          <MapClickHandler />
        </MapContainer>
      )}

      {/* Top bar, FAB, bottom sheet, toast – unchanged */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm shadow-lg rounded-full px-4 py-2 flex items-center gap-3 w-[95%] max-w-xl">
        <div className="font-bold text-slate-800 text-sm sm:text-base">🚦 <span className="text-indigo-600">DRISHTI</span></div>
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search destination..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value);
              setShowSearchResults(e.target.value.length > 0); }}
            onFocus={() => setShowSearchResults(searchQuery.length > 0)}
            onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
            className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm outline-none focus:border-indigo-500 focus:bg-white"
          />
          <AnimatePresence>
            {showSearchResults && filteredLandmarks.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50"
              >
                {filteredLandmarks.map(l => (
                  <div
                    key={l.name}
                    className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                    onMouseDown={() => { setDestination(l);
                      setSearchQuery(l.name);
                      setShowSearchResults(false); }}
                  >
                    {l.name}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {routeBanner && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-sm shadow-md rounded-full px-4 py-2 border border-slate-200 text-sm text-slate-800 max-w-[90%] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span>
            Route adjusted — <span className="font-semibold text-red-600">{routeBanner.type}</span> avoided on{' '}
            <span className="font-medium">{routeBanner.road}</span>
          </span>
        </div>
      )}

      <button
        onClick={() => setShowReportSheet(true)}
        className="absolute bottom-28 right-4 z-[1000] bg-indigo-600 text-white rounded-full px-5 py-3 shadow-xl flex items-center gap-2 font-medium hover:bg-indigo-700 transition active:scale-95"
      >
        <AlertTriangle className="w-5 h-5" /> Report issue
      </button>

      <AnimatePresence>
        {showReportSheet && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-[2000] bg-white/95 backdrop-blur-lg rounded-t-3xl shadow-2xl p-6 max-h-[70vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Report a hazard</h3>
              <button onClick={() => setShowReportSheet(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as Hazard['type'])}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  {['accident', 'waterlogging', 'blockage', 'rally'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <button
                  onClick={() => {
                    if (navigator.geolocation)
                      navigator.geolocation.getCurrentPosition(
                        pos => { setReportLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                          setToast({ message: 'Location set via GPS', type: 'success' });
                          setTimeout(() => setToast(null), 2000); },
                        () => setToast({ message: 'Unable to get location', type: 'warning' })
                      );
                  }}
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-indigo-400 bg-indigo-50 rounded-xl py-3 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition"
                >
                  <Locate className="w-4 h-4" />
                  {reportLocation ? `📍 ${reportLocation.lat.toFixed(5)}, ${reportLocation.lng.toFixed(5)}` :
                    'Tap map or use current location'}
                </button>
                <p className="text-xs text-slate-400 mt-1">Click on the map to place a pin manually</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
                <textarea
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm resize-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="What's happening?"
                />
              </div>
              <button
                onClick={handleReportSubmit}
                className="w-full bg-indigo-600 text-white rounded-full py-3 font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> Submit report
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-slate-800/90 backdrop-blur-sm text-white px-6 py-3 rounded-full shadow-lg text-sm max-w-[90%]"
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
