'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

export default function HomePage() {
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('drishti-sync-banner-dismissed');
    if (dismissed === 'true') setBannerDismissed(true);
  }, []);

  const dismissBanner = () => {
    localStorage.setItem('drishti-sync-banner-dismissed', 'true');
    setBannerDismissed(true);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl w-full">
        {/* Pitch */}
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900">
            <span className="text-indigo-600">DRISHTI</span>
          </h1>
          <p className="mt-3 text-lg text-slate-600 max-w-2xl mx-auto">
            Real‑time traffic hazard awareness &amp; adaptive signals for safer cities.
          </p>
          <div className="mt-2 text-sm text-slate-500 max-w-xl mx-auto space-y-1">
            <p><span className="font-medium">Problem:</span> City drivers lack real‑time hazard info, and signals don't adapt to emergencies.</p>
            <p><span className="font-medium">Approach:</span> A shared state across tabs (same browser) for instant hazard reporting, police confirmation, and ambulance priority.</p>
          </div>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Link href="/citizen" className="group block">
            <div className="card-hover bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:border-indigo-300 h-full flex flex-col">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl mb-5 group-hover:bg-indigo-100 transition">
                🚗
              </div>
              <h2 className="text-xl font-semibold text-slate-800">Driver</h2>
              <p className="text-sm text-slate-500 mt-1 flex-1">Real‑time hazard alerts, route awareness, and signal status for commuters.</p>
              <div className="mt-4 text-sm font-medium text-indigo-600 group-hover:underline">
                Enter app →
              </div>
            </div>
          </Link>

          <Link href="/police" className="group block">
            <div className="card-hover bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:border-amber-500 h-full flex flex-col">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl mb-5 group-hover:bg-amber-100 transition">
                👮
              </div>
              <h2 className="text-xl font-semibold text-slate-800">Traffic Police</h2>
              <p className="text-sm text-slate-500 mt-1 flex-1">Confirm &amp; resolve hazards, manage officer presence, and monitor zone activity.</p>
              <div className="mt-4 text-sm font-medium text-amber-600 group-hover:underline">
                Enter app →
              </div>
            </div>
          </Link>

          <Link href="/dashboard" className="group block">
            <div className="card-hover bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:border-emerald-500 h-full flex flex-col">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl mb-5 group-hover:bg-emerald-100 transition">
                🖥️
              </div>
              <h2 className="text-xl font-semibold text-slate-800">Control Room</h2>
              <p className="text-sm text-slate-500 mt-1 flex-1">Centralized dashboard with live hazard heatmap, signal status, and ambulance tracking.</p>
              <div className="mt-4 text-sm font-medium text-emerald-600 group-hover:underline">
                Enter app →
              </div>
            </div>
          </Link>
        </div>

        {/* Sync Banner */}
        {!bannerDismissed && (
          <div className="mt-8 bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3 text-sm text-slate-700 relative">
            <div className="flex-1">
              <span className="font-medium">📡 Cross‑tab sync reminder:</span> This demo only syncs across tabs on the <strong>same device and browser</strong> (via BroadcastChannel + localStorage). Open /citizen, /police, and /dashboard in separate tabs to see live updates.
            </div>
            <button onClick={dismissBanner} className="text-slate-400 hover:text-slate-600 transition flex-shrink-0 mt-0.5">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-slate-400 border-t border-slate-200 pt-4">
          Hackathon prototype · No backend · All state in browser
        </div>
      </div>

      <style jsx>{`
        .card-hover {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </main>
  );
}
