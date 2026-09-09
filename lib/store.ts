import { create } from 'zustand';
import { Hazard, Intersection, Zone, Officer, AmbulanceTrip } from './types';

const genId = () => 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);

// Seed data
const SEED_INTERSECTIONS: Intersection[] = [
  {
    id: 'int-1',
    name: 'Trinity Circle',
    lat: 12.9716,
    lng: 77.5946,
    status: 'green',
    signal: 'green',
    laneCounts: [12, 8, 10, 6],
    greenLaneIndex: 0,
    greenSeconds: 15,
    totalLanes: 4,
    ambulanceOverride: false,
    displayMessage: null,
  },
  {
    id: 'int-2',
    name: 'Anil Kumble Circle',
    lat: 12.9762,
    lng: 77.5988,
    status: 'green',
    signal: 'green',
    laneCounts: [9, 7, 11, 5],
    greenLaneIndex: 2,
    greenSeconds: 12,
    totalLanes: 4,
    ambulanceOverride: false,
    displayMessage: null,
  },
  {
    id: 'int-3',
    name: 'Richmond Circle',
    lat: 12.9658,
    lng: 77.6012,
    status: 'green',
    signal: 'green',
    laneCounts: [6, 10, 8, 7],
    greenLaneIndex: 1,
    greenSeconds: 18,
    totalLanes: 4,
    ambulanceOverride: false,
    displayMessage: null,
  },
  {
    id: 'int-4',
    name: 'Museum Road Junction',
    lat: 12.9692,
    lng: 77.6060,
    status: 'green',
    signal: 'green',
    laneCounts: [14, 9, 12, 8],
    greenLaneIndex: 3,
    greenSeconds: 10,
    totalLanes: 4,
    ambulanceOverride: false,
    displayMessage: null,
  },
];

const SEED_ZONES: Zone[] = [
  { id: 'zone-1', name: 'MG Road Zone', lat: 12.9716, lng: 77.5946, radius: 800 },
  { id: 'zone-2', name: 'Cubbon Park Zone', lat: 12.9762, lng: 77.5988, radius: 700 },
];

const SEED_OFFICERS: Officer[] = [
  { id: 'off-1', name: 'Officer Kumar', lat: 12.9720, lng: 77.5950, zoneId: 'zone-1' },
  { id: 'off-2', name: 'Officer Priya', lat: 12.9755, lng: 77.5990, zoneId: 'zone-2' },
  { id: 'off-3', name: 'Officer Singh', lat: 12.9680, lng: 77.6005, zoneId: 'zone-1' },
];

const SEED_HAZARDS: Hazard[] = [
  {
    id: 'haz-1',
    type: 'accident',
    lat: 12.9740,
    lng: 77.5960,
    description: 'Minor collision near Cubbon Park',
    reportedBy: 'police',
    status: 'active',
    weight: 2,
    createdAt: Date.now() - 600000,
    updatedAt: Date.now() - 600000,
  },
  {
    id: 'haz-2',
    type: 'waterlogging',
    lat: 12.9695,
    lng: 77.6020,
    description: 'Waterlogging on Museum Road',
    reportedBy: 'police',
    status: 'active',
    weight: 1,
    createdAt: Date.now() - 1200000,
    updatedAt: Date.now() - 1200000,
  },
];

export interface DrishtiState {
  hazards: Hazard[];
  intersections: Intersection[];
  zones: Zone[];
  officers: Officer[];
  ambulanceTrips: AmbulanceTrip[];

  addHazard: (hazard: Omit<Hazard, 'id' | 'createdAt' | 'updatedAt'>) => void;
  confirmHazard: (id: string) => void;
  dismissHazard: (id: string) => void;
  resolveHazard: (id: string) => void;
  updateIntersection: (id: string, partial: Partial<Intersection>) => void;
  addAmbulanceTrip: (trip: Omit<AmbulanceTrip, 'id'>) => void;
  updateAmbulanceProgress: (id: string, currentIndex: number) => void;
  completeAmbulanceTrip: (id: string) => void;
  resetDemo: () => void;
  seed: () => void;
}

export const useDrishtiStore = create<DrishtiState>((set, get) => ({
  hazards: [],
  intersections: [],
  zones: [],
  officers: [],
  ambulanceTrips: [],

  addHazard: (hazard) =>
    set((state) => ({
      hazards: [
        ...state.hazards,
        {
          ...hazard,
          id: genId(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        } as Hazard,
      ],
    })),

  confirmHazard: (id) =>
    set((state) => ({
      hazards: state.hazards.map((h) =>
        h.id === id
          ? { ...h, status: 'active', updatedAt: Date.now(), weight: h.weight + 2 }
          : h
      ),
    })),

  dismissHazard: (id) =>
    set((state) => ({
      hazards: state.hazards.map((h) =>
        h.id === id ? { ...h, status: 'dismissed', updatedAt: Date.now() } : h
      ),
    })),

  resolveHazard: (id) =>
    set((state) => ({
      hazards: state.hazards.map((h) =>
        h.id === id ? { ...h, status: 'resolved', updatedAt: Date.now() } : h
      ),
    })),

  updateIntersection: (id, partial) =>
    set((state) => ({
      intersections: state.intersections.map((i) =>
        i.id === id ? { ...i, ...partial } : i
      ),
    })),

  addAmbulanceTrip: (trip) =>
    set((state) => ({
      ambulanceTrips: [...state.ambulanceTrips, { ...trip, id: genId() }],
    })),

  updateAmbulanceProgress: (id, currentIndex) =>
    set((state) => ({
      ambulanceTrips: state.ambulanceTrips.map((t) =>
        t.id === id ? { ...t, currentIndex } : t
      ),
    })),

  completeAmbulanceTrip: (id) =>
    set((state) => ({
      ambulanceTrips: state.ambulanceTrips.map((t) =>
        t.id === id ? { ...t, status: 'completed' } : t
      ),
    })),

  resetDemo: () =>
    set({
      hazards: [],
      intersections: [],
      zones: [],
      officers: [],
      ambulanceTrips: [],
    }),

  seed: () => {
    const seeded = localStorage.getItem('drishti-seeded');
    if (seeded) return;
    set({
      intersections: SEED_INTERSECTIONS,
      zones: SEED_ZONES,
      officers: SEED_OFFICERS,
      hazards: SEED_HAZARDS,
      ambulanceTrips: [],
    });
    localStorage.setItem('drishti-seeded', 'true');
  },
}));
