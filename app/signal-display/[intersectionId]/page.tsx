'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useDrishtiStore } from '@/lib/store';
import { initSync } from '@/lib/sync';
import { motion, AnimatePresence } from 'framer-motion';

export default function SignalDisplayPage() {
  const { intersectionId } = useParams<{ intersectionId: string }>();
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => { initSync(); }, []);

  const intersection = useDrishtiStore((state) =>
    state.intersections.find(i => i.id === intersectionId)
  );

  useEffect(() => {
    if (!intersection?.displayMessage) { setShowMessage(false); return; }
    const interval = setInterval(() => setShowMessage(prev => !prev), 4000);
    return () => clearInterval(interval);
  }, [intersection?.displayMessage]);

  if (!intersection) return <div className="min-h-screen bg-black flex items-center justify-center text-white text-2xl">Intersection not found</div>;

  const hasMessage = !!intersection.displayMessage;
  const showOverride = showMessage && hasMessage;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-light text-gray-400 mb-8">{intersection.name}</h2>
        <AnimatePresence mode="wait">
          {showOverride ? (
            <motion.div key="message" initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}} className="space-y-6">
              <div className="text-5xl md:text-7xl font-bold text-yellow-400">{intersection.displayMessage}</div>
              <div className="text-2xl md:text-3xl text-white">Open DRISHTI to reroute</div>
            </motion.div>
          ) : (
            <motion.div key="signal" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="space-y-8">
              <div className="flex justify-center gap-12">
                {intersection.laneCounts.map((_, idx) => {
                  const isGreen = idx === intersection.greenLaneIndex;
                  return (
                    <div key={idx} className="flex flex-col items-center">
                      <div className={`w-20 h-20 rounded-full border-4 ${isGreen ? 'bg-green-500 border-green-300' : 'bg-gray-700 border-gray-500'}`}></div>
                      <span className="text-white mt-2 text-xl">Lane {idx + 1}</span>
                    </div>
                  );
                })}
              </div>
              <div className="text-8xl md:text-9xl font-mono font-bold text-green-400">{intersection.greenSeconds}</div>
              <div className="text-2xl text-gray-300">Green lane: Lane {intersection.greenLaneIndex + 1}</div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="mt-12 text-sm text-gray-500">{hasMessage ? '⚠️ Advisory active' : 'Normal operation'}</div>
      </div>
    </div>
  );
}
