'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useDrishtiStore } from '@/lib/store';
import { initSync } from '@/lib/sync';
import { Hazard } from '@/lib/types';
import { Shield, AlertTriangle, CheckCircle, XCircle, Flag, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const hazardColors: Record<string, string> = { accident: '#ef4444', waterlogging: '#f59e0b', blockage: '#f59e0b',
  rally: '#8b5cf6' };
const hazardIcons: Record<string, string> = { accident: '🚨', waterlogging: '🌊', blockage: '🚧', rally: '🏳️' };

export default function PolicePage() {
  useEffect(() => { initSync(); }, []);
  const store = useDrishtiStore();
  const { officers, zones, hazards, confirmHazard, resolveHazard, addHazard } = store;

  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [selectedZone, setSelectedZone] = useState<typeof zones[0] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.9716, 77.5946]);
  const [flagMode, setFlagMode] = useState(false);
  const [flagLocation, setFlagLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [selectedHazardType, setSelectedHazardType] = useState<Hazard['type']>('accident');
  const [showUnconfirmed, setShowUnconfirmed] = useState(true);

  // Mount flag for Leaflet
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedOfficerId) { setSelectedZone(null);
      setMapCenter([12.9716, 77.5946]); return; }
    const officer = officers.find(o => o.id === selectedOfficerId);
    if (!officer) return;
    const zone = zones.find(z => z.id === officer.zoneId);
    if (zone) { setSelectedZone(zone);
      setMapCenter([zone.lat, zone.lng]); } else setSelectedZone(null);
  }, [selectedOfficerId, officers, zones]);

  const zoneHazards = selectedZone ? hazards.filter(h => haversineDistance(h.lat, h.lng, selectedZone.lat, selectedZone
    .lng) <= selectedZone.radius) : [];
  const unconfirmedHazards = zoneHazards.filter(h => h.status === 'unconfirmed');
  const activeHazards = zoneHazards.filter(h => h.status === 'active');
  const activeCount = activeHazards.length;
  const zoneStatus = activeCount >= 3 ? 'major' : activeCount >= 1 ? 'minor' : 'clear';

  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        if (!flagMode) return;
        const { lat, lng } = e.latlng;
        setFlagLocation({ lat, lng });
        setShowFlagModal(true);
      }
    });
    return null;
  };

  const handleFlagSubmit = () => {
    if (!flagLocation || !selectedZone) return;
    addHazard({
      type: selectedHazardType,
      lat: flagLocation.lat,
      lng: flagLocation.lng,
      description: `Flagged by officer ${selectedOfficerId}`,
      reportedBy: 'officer',
      status: 'active',
      weight: 2,
    });
    setShowFlagModal(false);
    setFlagLocation(null);
    setFlagMode(false);
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-[#141e33] border-b border-slate-700/50">
        <div className="flex items-center gap-3"><Shield className="w-6 h-6 text-amber-400" /><span className="font-bold text-lg">DRISHTI · Police</span></div>
        <div className="flex items-center gap-4">
          {selectedZone && (
            <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full text-sm">
              <span className="text-slate-400">{selectedZone.name}</span>
              <span className={`w-2 h-2 rounded-full ${zoneStatus === 'clear' ? 'bg-green-500' : zoneStatus === 'minor' ? 'bg-amber-400' : 'bg-red-500'}`}></span>
              <span className="capitalize text-slate-300">{zoneStatus}</span>
            </div>
          )}
          <div className="relative">
            <select
              value={selectedOfficerId}
              onChange={(e) => setSelectedOfficerId(e.target.value)}
              className="appearance-none bg-slate-800 border border-slate-600 rounded-full px-4 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Select officer</option>
              {officers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          {selectedZone ? (
            isMounted && (
              <MapContainer
                key="police-map"
                center={mapCenter}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  attribution='© OpenStreetMap'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                <Circle
                  center={[selectedZone.lat, selectedZone.lng]}
                  radius={selectedZone.radius}
                  pathOptions={{ color: '#475569', fillColor: '#1e293b', fillOpacity: 0.1, weight: 1 }}
                />
                {zoneHazards.map(h => {
                  const color = hazardColors[h.type] || '#f59e0b';
                  const iconHtml = hazardIcons[h.type] || '⚠️';
                  const icon = L.divIcon({
                    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:16px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);${h.status === 'unconfirmed' ? 'opacity:0.7;' : ''}">${iconHtml}</div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                  });
                  return (
                    <Marker key={h.id} position={[h.lat, h.lng]} icon={icon}>
                      <Popup>
                        <b>{h.type}</b><br />{h.description}<br />
                        <span className="text-xs text-slate-400">{h.status} · {h.reportedBy === 'officer' ? '👮 Officer' :
                          '👤 Citizen'}</span>
                      </Popup>
                    </Marker>
                  );
                })}
                <MapClickHandler />
              </MapContainer>
            )
          ) : (
            <div className="h-full flex items-center justify-center bg-[#0b1120] text-slate-500">
              <div className="text-center"><Shield className="w-16 h-16 mx-auto mb-4 text-slate-700" /><p className="text-lg">Select an officer to view your zone</p></div>
            </div>
          )}
          {selectedZone && (
            <button
              onClick={() => setFlagMode(!flagMode)}
              className={`absolute top-4 right-4 z-[1000] flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                flagMode ? 'bg-red-600 text-white hover:bg-red-700' :
                'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-600'
              }`}
            >
              <Flag className="w-4 h-4" />{flagMode ? 'Cancel flag' : 'Flag issue'}
            </button>
          )}
        </div>

        {selectedZone && (
          <div className="w-96 bg-[#141e33] border-l border-slate-700/50 p-4 overflow-y-auto flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
              <div><h3 className="font-semibold text-slate-200">{selectedZone.name}</h3><p className="text-xs text-slate-400">Officer: {officers.find(o => o.id === selectedOfficerId)?.name}</p></div>
              <div className="flex items-center gap-2 text-sm"><span className="text-slate-400">Active:</span><span className="font-bold text-amber-400">{activeCount}</span></div>
            </div>
            <div className="flex border-b border-slate-700/50">
              <button
                onClick={() => setShowUnconfirmed(true)}
                className={`flex-1 py-2 text-sm font-medium transition ${showUnconfirmed ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400 hover:text-slate-300'}`}
              >
                Needs confirmation ({unconfirmedHazards.length})
              </button>
              <button
                onClick={() => setShowUnconfirmed(false)}
                className={`flex-1 py-2 text-sm font-medium transition ${!showUnconfirmed ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400 hover:text-slate-300'}`}
              >
                Active ({activeHazards.length})
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {showUnconfirmed ? (
                unconfirmedHazards.length === 0 ? (
                  <div className="text-center text-slate-500 text-sm py-8"><CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500/50" />No pending confirmations</div>
                ) : (
                  unconfirmedHazards.map(h => (
                    <div key={h.id} className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
                      <div className="flex justify-between items-start">
                        <div><span className="text-xs text-slate-400">{h.type}</span><p className="text-sm text-slate-200">{h.description}</p><p className="text-xs text-slate-500">Citizen report</p></div>
                        <div className="flex gap-2">
                          <button onClick={() => confirmHazard(h.id)} className="p-1.5 bg-green-600/20 text-green-400 rounded-md hover:bg-green-600/30 transition"><CheckCircle className="w-4 h-4" /></button>
                          <button onClick={() => resolveHazard(h.id)} className="p-1.5 bg-red-600/20 text-red-400 rounded-md hover:bg-red-600/30 transition"><XCircle className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">Weight: {h.weight} {h.weight >= 3 ? '✅ Auto-activated' :
                        ''}</div>
                    </div>
                  ))
                )
              ) : (
                activeHazards.length === 0 ? (
                  <div className="text-center text-slate-500 text-sm py-8"><AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500/50" />No active hazards</div>
                ) : (
                  activeHazards.map(h => (
                    <div key={h.id} className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
                      <div className="flex justify-between items-start">
                        <div><span className="text-xs text-slate-400">{h.type}</span><p className="text-sm text-slate-200">{h.description}</p><p className="text-xs text-slate-500">{h.reportedBy === 'officer' ? '👮 Officer' : '👤 Citizen'} · Weight {h.weight}</p></div>
                        {h.reportedBy === 'officer' && (
                          <button onClick={() => resolveHazard(h.id)} className="p-1.5 bg-amber-600/20 text-amber-400 rounded-md hover:bg-amber-600/30 transition"><CheckCircle className="w-4 h-4" /></button>
                        )}
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showFlagModal && flagLocation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]"
            onClick={() => setShowFlagModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#1e293b] rounded-xl p-6 max-w-md w-full border border-slate-700 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><Flag className="w-5 h-5 text-amber-400" />Flag issue</h3>
              <div className="mb-4">
                <label className="block text-sm text-slate-300 mb-1">Type</label>
                <select
                  value={selectedHazardType}
                  onChange={(e) => setSelectedHazardType(e.target.value as Hazard['type'])}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {['accident', 'waterlogging', 'blockage', 'rally'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="text-sm text-slate-400 mb-4">Location: {flagLocation.lat.toFixed(5)}, {flagLocation.lng.toFixed(5)}</div>
              <div className="flex gap-3">
                <button onClick={() => setShowFlagModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 rounded-lg py-2 text-sm transition">Cancel</button>
                <button onClick={handleFlagSubmit} className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium rounded-lg py-2 text-sm transition">Confirm flag</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
