export type HazardType = 'accident' | 'waterlogging' | 'blockage' | 'rally';
export type HazardStatus = 'unconfirmed' | 'active' | 'dismissed' | 'resolved';

export interface Hazard {
  id: string;
  type: HazardType;
  lat: number;
  lng: number;
  description: string;
  reportedBy: 'citizen' | 'officer' | 'control' | 'camera';
  status: HazardStatus;
  weight: number;
  createdAt: number;
  updatedAt: number;
}

export interface Intersection {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: 'green' | 'amber' | 'red';
  signal: 'green' | 'amber' | 'red';
  laneCounts: number[];
  greenLaneIndex: number;
  greenSeconds: number;
  totalLanes: number;
  ambulanceOverride: boolean;
  displayMessage: string | null;
}

export interface Zone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
}

export interface Officer {
  id: string;
  name: string;
  lat: number;
  lng: number;
  zoneId: string;
}

export interface AmbulanceTrip {
  id: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  waypoints: { lat: number; lng: number }[];
  currentIndex: number;
  status: 'active' | 'completed';
}
