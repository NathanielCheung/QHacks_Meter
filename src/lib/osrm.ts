/**
 * OSRM (Open Source Routing Machine) API client for driving directions.
 * Same routing engine used by Leaflet Routing Machine. Uses the public demo
 * server (https://router.project-osrm.org); use your own OSRM instance for production.
 */

const OSRM_BASE = 'https://router.project-osrm.org/route/v1';

export interface RouteStep {
  instruction: string;
  distance?: string;
  name?: string;
}

export interface OSRMRouteResult {
  distance: number; // meters
  duration: number; // seconds
  coordinates: [number, number][]; // [lat, lng] for Leaflet
  steps: RouteStep[];
}

interface OSRMStep {
  maneuver?: { type?: string; modifier?: string };
  name?: string;
  distance?: number;
  duration?: number;
}

export interface OSRMRouteResponse {
  code: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry?: { coordinates: [number, number][] };
    legs?: Array<{ steps?: OSRMStep[] }>;
  }>;
  message?: string;
}

function formatStepInstruction(step: OSRMStep, isFirst: boolean, isLast: boolean): string {
  const type = step.maneuver?.type ?? 'turn';
  const modifier = step.maneuver?.modifier ?? '';
  const name = step.name && step.name.trim() ? step.name.trim() : '';

  if (isFirst) {
    return name ? `Head out on ${name}` : 'Head out';
  }
  if (isLast) {
    return name ? `Arrive at ${name}` : 'Arrive at destination';
  }

  const onto = name ? ` onto ${name}` : '';
  switch (type) {
    case 'depart':
      return name ? `Head out on ${name}` : 'Head out';
    case 'arrive':
      return name ? `Arrive at ${name}` : 'Arrive at destination';
    case 'turn':
      if (modifier === 'left') return `Turn left${onto}`;
      if (modifier === 'right') return `Turn right${onto}`;
      if (modifier === 'slight left') return `Slight left${onto}`;
      if (modifier === 'slight right') return `Slight right${onto}`;
      if (modifier === 'sharp left') return `Sharp left${onto}`;
      if (modifier === 'sharp right') return `Sharp right${onto}`;
      return name ? `Turn ${onto}` : 'Turn';
    case 'continue':
    case 'new name':
      return name ? `Continue on ${name}` : 'Continue';
    case 'merge':
      return name ? `Merge onto ${name}` : 'Merge';
    case 'roundabout':
    case 'rotary':
      return name ? `At the roundabout, take the exit onto ${name}` : 'At the roundabout, take the exit';
    case 'fork':
      if (modifier === 'left') return `Keep left${onto}`;
      if (modifier === 'right') return `Keep right${onto}`;
      return name ? `At the fork, follow ${name}` : 'At the fork';
    case 'end of road':
      return name ? `At the end of the road, turn ${modifier || 'onto'} ${name}` : 'At the end of the road';
    case 'on ramp':
      return name ? `Take the ramp onto ${name}` : 'Take the ramp';
    case 'off ramp':
      return name ? `Take the exit onto ${name}` : 'Take the exit';
    default:
      return name ? `Follow ${name}` : 'Continue';
  }
}

export async function getRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<OSRMRouteResult | null> {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `${OSRM_BASE}/driving/${coords}?overview=full&geometries=geojson&steps=true`;
  try {
    const res = await fetch(url);
    const data: OSRMRouteResponse = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) {
      return null;
    }
    const route = data.routes[0];
    const coordinates =
      route.geometry?.coordinates?.map(([lng, lat]) => [lat, lng] as [number, number]) ?? [];
    const rawSteps = route.legs?.[0]?.steps ?? [];
    const steps: RouteStep[] = rawSteps.map((s, i) => ({
      instruction: formatStepInstruction(s, i === 0, i === rawSteps.length - 1),
      distance: s.distance != null ? formatDistance(s.distance) : undefined,
      name: s.name || undefined,
    }));
    return {
      distance: route.distance,
      duration: route.duration,
      coordinates,
      steps,
    };
  } catch {
    return null;
  }
}

/** Walking route (e.g. parking spot → searched destination). Full route with geometry and steps. */
export async function getWalkingRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<OSRMRouteResult | null> {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `${OSRM_BASE}/walking/${coords}?overview=full&geometries=geojson&steps=true`;
  try {
    const res = await fetch(url);
    const data: OSRMRouteResponse = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) {
      return null;
    }
    const route = data.routes[0];
    const coordinates =
      route.geometry?.coordinates?.map(([lng, lat]) => [lat, lng] as [number, number]) ?? [];
    const rawSteps = route.legs?.[0]?.steps ?? [];
    const steps: RouteStep[] = rawSteps.map((s, i) => ({
      instruction: formatStepInstruction(s, i === 0, i === rawSteps.length - 1),
      distance: s.distance != null ? formatDistance(s.distance) : undefined,
      name: s.name || undefined,
    }));
    return {
      distance: route.distance,
      duration: route.duration,
      coordinates,
      steps,
    };
  } catch {
    return null;
  }
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
