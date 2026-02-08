import type { ParkingLocation } from '@/data/parkingData';
import {
  getCurrentPrice,
  isLocationOpen,
  getHoursDisplay,
  KINGSTON_CENTER,
} from '@/data/parkingData';
import { haversineDistance } from '@/lib/distance';

/** Optional user/search location for "closest to me" answers */
export interface ChatUserLocation {
  lat: number;
  lng: number;
}

// Landmarks for location-based questions (approx coordinates)
const LANDMARKS: Record<string, { lat: number; lng: number; label: string }> = {
  "queen's": { lat: 44.2287, lng: -76.4915, label: "Queen's University" },
  "queens": { lat: 44.2287, lng: -76.4915, label: "Queen's University" },
  university: { lat: 44.2287, lng: -76.4915, label: "Queen's University" },
  waterfront: { lat: 44.226, lng: -76.485, label: "Kingston Waterfront" },
  hospital: { lat: 44.2295, lng: -76.496, label: "Kingston General Hospital (KGH)" },
  kgh: { lat: 44.2295, lng: -76.496, label: "Kingston General Hospital" },
  downtown: { lat: KINGSTON_CENTER.lat, lng: KINGSTON_CENTER.lng, label: "downtown Kingston" },
};

const NEAR_RADIUS_M = 400;

// Name/keyword match for streets and lots (order matters: longer names first)
const NAME_KEYWORDS: { keyword: string; match: (loc: ParkingLocation) => boolean }[] = [
  { keyword: "beamish munro", match: (l) => l.id === "beamish-munro-hall" || l.name.toLowerCase().includes("beamish") },
  { keyword: "chown garage", match: (l) => l.id === "chown-garage" || (l.name.toLowerCase().includes("chown") && l.type === "lot") },
  { keyword: "hanson garage", match: (l) => l.id === "hanson-garage" || l.name.toLowerCase().includes("hanson") },
  { keyword: "waterfront", match: (l) => l.id === "waterfront-lot" || l.name.toLowerCase().includes("waterfront") },
  { keyword: "princess", match: (l) => l.name.toLowerCase().includes("princess") || l.id === "princess-st" },
  { keyword: "king street", match: (l) => l.name.toLowerCase().includes("king") },
  { keyword: "king", match: (l) => l.name.toLowerCase().includes("king") },
  { keyword: "brock", match: (l) => l.name.toLowerCase().includes("brock") },
  { keyword: "ontario", match: (l) => l.name.toLowerCase().includes("ontario") },
  { keyword: "division", match: (l) => l.name.toLowerCase().includes("division") },
  { keyword: "wellington", match: (l) => l.name.toLowerCase().includes("wellington") },
  { keyword: "clergy", match: (l) => l.name.toLowerCase().includes("clergy") },
  { keyword: "barrack", match: (l) => l.name.toLowerCase().includes("barrack") },
  { keyword: "angrove", match: (l) => l.name.toLowerCase().includes("angrove") },
  { keyword: "library", match: (l) => l.name.toLowerCase().includes("library") },
  { keyword: "mckee", match: (l) => l.name.toLowerCase().includes("mckee") },
  { keyword: "garage", match: (l) => l.name.toLowerCase().includes("garage") },
  { keyword: "lot", match: (l) => l.type === "lot" },
  { keyword: "street", match: (l) => l.type === "street" },
];

function findLocationsByQuestion(
  locations: ParkingLocation[],
  q: string
): { filtered: ParkingLocation[]; matchedName: string | null } {
  let filtered = locations;
  let matchedName: string | null = null;
  for (const { keyword, match } of NAME_KEYWORDS) {
    if (q.includes(keyword)) {
      matchedName = keyword;
      filtered = locations.filter(match);
      if (filtered.length > 0) break;
    }
  }
  return { filtered, matchedName };
}

function filterByLandmark(
  locations: ParkingLocation[],
  landmarkKey: string
): ParkingLocation[] {
  const lm = LANDMARKS[landmarkKey];
  if (!lm) return locations;
  return locations.filter(
    (loc) => haversineDistance(loc.lat, loc.lng, lm.lat, lm.lng) <= NEAR_RADIUS_M
  );
}

/**
 * Answer a natural-language question about Kingston parking.
 * Pass optional userLocation (e.g. from search) for "closest to me" answers.
 */
export function answerParkingQuestion(
  locations: ParkingLocation[],
  question: string,
  now: Date = new Date(),
  userLocation?: ChatUserLocation | null
): string {
  const q = question.trim().toLowerCase();
  if (!q) {
    return "Ask me about parking in downtown Kingston! Try: \"How many spots on Princess Street?\" or \"Is there parking near Queen's University?\"";
  }

  // --- Help ---
  if (/^(help|what can you do|hi|hello)\b/.test(q) || q === "?") {
    return "I can answer:\n• \"How many spots on Princess Street?\" / \"Is King Street full?\"\n• \"Any free street parking downtown?\" / \"Which street has the most available?\"\n• \"Where is the closest available parking to me?\" (search an address first)\n• \"How many spots in the Chown garage?\" / \"What % of Beamish Munro is full?\"\n• \"Parking near Queen's University?\" / \"Near the Waterfront?\"\n• \"What streets if the lot is full?\"\n• \"Why does the map say full but I see an empty spot?\"";
  }

  // --- Real-time / status: "Has a spot just opened?" / "Why does map say full but I see empty?" ---
  if (/just opened|spot (just )?opened|opened up/.test(q)) {
    return "We update every few seconds from sensors. If a spot just opened, the map will show it shortly. Try refreshing or wait a few seconds.";
  }
  if (/why does the map say full|map say full but I see empty|say full but.*empty|empty spot/.test(q)) {
    return "Sensors can lag by a few seconds, or someone may have just left. The map updates every 5–10 seconds. If you see an empty spot, it may have opened after the last update—check the map again for the latest.";
  }

  // --- Time / prediction: we don't have historical or prediction data ---
  if (/usually busy|best time to find|get worse or better|next hour|prediction|predict/.test(q)) {
    return "We don’t have historical patterns or predictions—only live availability. Mornings and weekends are often easier downtown. Use the map for current spots.";
  }

  // --- Filling up or emptying (no trend data) ---
  if (/filling up|emptying|emptying out|trend/.test(q)) {
    return "We don’t track whether a lot is filling up or emptying in real time—only how many spots are available right now. Check the map for current counts.";
  }

  // --- Location-based: near Queen's, KGH, Waterfront, restaurants on Princess ---
  for (const key of Object.keys(LANDMARKS)) {
    if (q.includes(key) && (q.includes("near") || q.includes("close") || q.includes("parking") || q.includes("show"))) {
      const near = filterByLandmark(locations, key);
      const withSpots = near.filter((l) => isLocationOpen(l, now) && l.availableSpots > 0);
      const lm = LANDMARKS[key];
      if (withSpots.length > 0) {
        const list = withSpots
          .slice(0, 6)
          .map((l) => `${l.name} (${l.availableSpots} available)`)
          .join("; ");
        return `Near ${lm.label}: ${list}. See the map for directions.`;
      }
      if (near.length > 0) {
        const names = near.slice(0, 5).map((l) => l.name).join(", ");
        return `Near ${lm.label} we have: ${names}. Right now none show available spots—check the map for live updates.`;
      }
      return `We don’t have parking data right at ${lm.label}. Try searching an address on the map to see nearby options.`;
    }
  }
  if (/restaurants on princess|princess street.*restaurant|eating on princess/.test(q)) {
    const princess = locations.filter((l) => l.name.toLowerCase().includes("princess"));
    if (princess.length > 0) {
      const p = princess[0];
      const status = isLocationOpen(p, now)
        ? `${p.availableSpots} of ${p.totalSpots} spots available on Princess Street.`
        : "Princess Street parking is currently outside paid hours.";
      return `${status} Street parking runs along Princess—check the map for the exact stretch.`;
    }
  }

  // --- Closest available to me (requires user location) ---
  if (/closest (available )?parking|closest (to )?me|nearest|parking (closest )?to me/.test(q)) {
    if (userLocation) {
      const withSpots = locations.filter(
        (l) => isLocationOpen(l, now) && l.availableSpots > 0
      );
      if (withSpots.length === 0) {
        return "No spots are available right now near you. Try expanding your search on the map or another time.";
      }
      const sorted = [...withSpots].sort(
        (a, b) =>
          haversineDistance(userLocation.lat, userLocation.lng, a.lat, a.lng) -
          haversineDistance(userLocation.lat, userLocation.lng, b.lat, b.lng)
      );
      const top = sorted[0];
      const dist = Math.round(haversineDistance(userLocation.lat, userLocation.lng, top.lat, top.lng));
      return `Closest available: ${top.name} (${top.availableSpots} spots), about ${dist} m away. Check the map for the exact location.`;
    }
    return "Search for an address on the map first—then I can tell you the closest available parking to that spot.";
  }

  // --- Which street has the most available? ---
  if (/which (street|lot) has the most|most available|highest availability/.test(q)) {
    const streets = locations.filter((l) => l.type === "street" && isLocationOpen(l, now) && l.availableSpots > 0);
    const bySpots = [...streets].sort((a, b) => b.availableSpots - a.availableSpots);
    if (bySpots.length > 0) {
      const top = bySpots[0];
      return `${top.name} has the most right now: ${top.availableSpots} spots available.`;
    }
    const lotsWithSpots = locations.filter((l) => l.type === "lot" && isLocationOpen(l, now) && l.availableSpots > 0);
    const lotBySpots = [...lotsWithSpots].sort((a, b) => b.availableSpots - a.availableSpots);
    if (lotBySpots.length > 0) {
      const top = lotBySpots[0];
      return `${top.name} has the most available: ${top.availableSpots} spots.`;
    }
    return "No streets or lots with available spots right now. Check the map for updates.";
  }

  // --- What streets to check if [lot] is full? ---
  if (/what streets (should I )?check|if .* (is )?full|lot (is )?full.*(where|what|check)/.test(q)) {
    const { filtered } = findLocationsByQuestion(locations, q);
    const full = filtered.filter((l) => isLocationOpen(l, now) && l.availableSpots === 0);
    if (full.length > 0) {
      const withSpots = locations.filter(
        (l) => l.id !== full[0].id && isLocationOpen(l, now) && l.availableSpots > 0
      );
      const nearby = withSpots.slice(0, 6).map((l) => l.name).join(", ");
      return `If ${full[0].name} is full, try: ${nearby}. See the map for distances.`;
    }
    const withSpots = locations.filter((l) => isLocationOpen(l, now) && l.availableSpots > 0);
    const names = withSpots.slice(0, 6).map((l) => l.name).join(", ");
    return `Places with spots right now: ${names}.`;
  }

  const { filtered, matchedName } = findLocationsByQuestion(locations, q);

  // --- "Parking Lot A" / generic lot name: we use real names ---
  if (/\bparking lot [a-c]\b|lot [a-c](\s|$)/.test(q) && filtered.length === 0) {
    return "We use actual names, not letters. Try: \"Beamish Munro Hall\", \"Chown Memorial Garage\", \"Waterfront Lot\", or \"Hanson Garage.\"";
  }

  // --- How many spots available on [X] right now? ---
  if (/how many (parking )?spots (are )?available|how many (spots )?(are )?(there )?(on|in)/.test(q) && filtered.length > 0) {
    const loc = filtered[0];
    if (!isLocationOpen(loc, now)) {
      return `${loc.name} is currently closed. ${getHoursDisplay(loc, now)}.`;
    }
    return `Right now there are ${loc.availableSpots} spot${loc.availableSpots !== 1 ? "s" : ""} available on ${loc.name} (${loc.totalSpots} total).`;
  }

  // --- Is [X] full? ---
  if (/is .* full\???\s*$|full\??\s*$/.test(q) && filtered.length > 0) {
    const loc = filtered[0];
    if (!isLocationOpen(loc, now)) {
      return `${loc.name} is currently closed. ${getHoursDisplay(loc, now)}.`;
    }
    if (loc.availableSpots === 0) {
      return `Yes, ${loc.name} is full right now (${loc.totalSpots} spots, 0 available).`;
    }
    return `No. ${loc.name} has ${loc.availableSpots} spot${loc.availableSpots !== 1 ? "s" : ""} available.`;
  }

  // --- Parking lot: total spots, how many cars, spots left, percentage full ---
  if (filtered.length > 0 && (filtered[0].type === "lot" || /lot|garage/.test(q))) {
    const loc = filtered[0];
    const total = loc.totalSpots;
    const available = loc.availableSpots;
    const occupied = total - available;

    if (/how many total spots|total spots (are )?(in|at)/.test(q)) {
      return `${loc.name} has ${total} total spots.`;
    }
    if (/how many cars|cars (are )?currently|currently (in|parked)/.test(q)) {
      if (!isLocationOpen(loc, now)) {
        return `${loc.name} is closed. We don’t track car count when closed.`;
      }
      return `There are ${occupied} cars currently in ${loc.name} (${available} spots left).`;
    }
    if (/spots (left|remaining)|how many (spots )?left/.test(q)) {
      if (!isLocationOpen(loc, now)) {
        return `${loc.name} is currently closed. ${getHoursDisplay(loc, now)}.`;
      }
      return `There are ${available} spots left in ${loc.name} (out of ${total}).`;
    }
    if (/what percentage|percent(age)? (is )?full|% full/.test(q)) {
      if (!isLocationOpen(loc, now)) {
        return `${loc.name} is closed. ${getHoursDisplay(loc, now)}.`;
      }
      const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
      return `${loc.name} is ${pct}% full (${occupied} of ${total} spots taken).`;
    }
  }

  // --- Free parking ---
  const askFree = /free|no cost|don't pay|no pay|complimentary/.test(q);
  if (askFree) {
    const freeNow = filtered.filter((loc) => {
      if (!isLocationOpen(loc, now)) return false;
      const price = getCurrentPrice(loc, now);
      return price !== null && price.rate === 0;
    });
    if (freeNow.length > 0) {
      const names = freeNow.map((l) => l.name).join(", ");
      return `Yes. Right now these have free parking: ${names}.`;
    }
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const today = dayNames[now.getDay()];
    if (filtered.length > 0) {
      const first = filtered[0];
      const price = getCurrentPrice(first, now);
      if (price && price.rate === 0) return `Yes, ${first.name} is free right now.`;
      return `Right now it’s paid on ${today}. Many downtown streets (Princess, King, Brock, Division, Ontario, Wellington, Clergy) are free on Sundays.`;
    }
    const allFreeNow = locations.filter((loc) => {
      if (!isLocationOpen(loc, now)) return false;
      const price = getCurrentPrice(loc, now);
      return price !== null && price.rate === 0;
    });
    if (allFreeNow.length > 0) {
      const names = allFreeNow.slice(0, 8).map((l) => l.name).join(", ");
      return `Yes. Free right now: ${names}.`;
    }
    return "No free street parking right now. Many downtown streets are free on Sundays.";
  }

  // --- Any available? / spots left? (general) ---
  const askAvailable = /available|any spots?|open spots?|vacant|(is there )?any( space)?|spots? (left|open)|(any )?space/.test(q);
  const askFull = /full|no space|no spots?|any room/.test(q);
  if (askAvailable || askFull) {
    const openWithSpots = filtered.filter(
      (l) => isLocationOpen(l, now) && l.availableSpots > 0
    );
    const full = filtered.filter(
      (l) => isLocationOpen(l, now) && l.availableSpots === 0
    );
    if (askFull && full.length > 0) {
      const list = full.map((l) => `${l.name} (${l.availableSpots}/${l.totalSpots})`).join(", ");
      return `These are full: ${list}.`;
    }
    if (openWithSpots.length > 0) {
      const list = openWithSpots
        .map((l) => `${l.name}: ${l.availableSpots} available`)
        .join(". ");
      return `Yes. ${list}`;
    }
    if (filtered.length > 0) {
      return `Right now there are no spots available at ${filtered.map((l) => l.name).join(", ")}. Try the map for other options.`;
    }
    return "I couldn’t find that street or lot. Try Princess, King, Brock, Ontario, or Beamish Munro.";
  }

  // --- Rate / price ---
  if (/rate|price|cost|how much|pay|fee/.test(q) && filtered.length > 0) {
    const loc = filtered[0];
    const price = getCurrentPrice(loc, now);
    const hours = getHoursDisplay(loc, now);
    if (price) return `${loc.name}: ${price.label}. Hours: ${hours}.`;
    return `${loc.name}: no casual rate (permit or closed). Hours: ${hours}.`;
  }

  // --- Generic: one location summary ---
  if (matchedName && filtered.length > 0) {
    const loc = filtered[0];
    const price = getCurrentPrice(loc, now);
    const open = isLocationOpen(loc, now);
    const status = open
      ? `${loc.availableSpots} of ${loc.totalSpots} spots available`
      : "currently closed";
    const rate = price ? ` ${price.label}.` : "";
    return `${loc.name}: ${status}.${rate} ${getHoursDisplay(loc, now)}.`;
  }

  if (filtered.length === 0 && matchedName) {
    return "I don’t have that street or lot. We cover downtown Kingston—try Princess, King, Brock, Ontario, Beamish Munro, or Chown Garage.";
  }

  return "Ask something like: \"How many spots on Princess?\" or \"Is there parking near Queen's?\" I use live data from the map.";
}
