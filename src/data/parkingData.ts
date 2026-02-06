export interface ParkingLocation {
  id: string;
  name: string;
  type: 'street' | 'lot';
  totalSpots: number;
  availableSpots: number;
  lat: number;
  lng: number;
  address?: string;
}

// Downtown Kingston, Ontario coordinates centered around Princess St
export const KINGSTON_CENTER = {
  lat: 44.2312,
  lng: -76.4860,
};

export const initialParkingData: ParkingLocation[] = [
  // Streets
  {
    id: 'princess-st',
    name: 'Princess Street',
    type: 'street',
    totalSpots: 12,
    availableSpots: 3,
    lat: 44.2312,
    lng: -76.4820,
    address: 'Princess St, Downtown Kingston',
  },
  {
    id: 'king-st-e',
    name: 'King Street East',
    type: 'street',
    totalSpots: 8,
    availableSpots: 0,
    lat: 44.2295,
    lng: -76.4785,
    address: 'King St E, Downtown Kingston',
  },
  {
    id: 'division-st',
    name: 'Division Street',
    type: 'street',
    totalSpots: 10,
    availableSpots: 2,
    lat: 44.2335,
    lng: -76.4870,
    address: 'Division St, Downtown Kingston',
  },
  {
    id: 'brock-st',
    name: 'Brock Street',
    type: 'street',
    totalSpots: 6,
    availableSpots: 4,
    lat: 44.2298,
    lng: -76.4840,
    address: 'Brock St, Downtown Kingston',
  },
  {
    id: 'ontario-st',
    name: 'Ontario Street',
    type: 'street',
    totalSpots: 15,
    availableSpots: 7,
    lat: 44.2280,
    lng: -76.4780,
    address: 'Ontario St, Downtown Kingston',
  },
  {
    id: 'wellington-st',
    name: 'Wellington Street',
    type: 'street',
    totalSpots: 8,
    availableSpots: 1,
    lat: 44.2320,
    lng: -76.4900,
    address: 'Wellington St, Downtown Kingston',
  },
  // Parking Lots
  {
    id: 'lot-a',
    name: 'Market Square Lot',
    type: 'lot',
    totalSpots: 50,
    availableSpots: 12,
    lat: 44.2305,
    lng: -76.4810,
    address: 'Behind City Hall',
  },
  {
    id: 'lot-b',
    name: 'Springer Market Garage',
    type: 'lot',
    totalSpots: 200,
    availableSpots: 0,
    lat: 44.2290,
    lng: -76.4860,
    address: '352 King St E',
  },
  {
    id: 'lot-c',
    name: 'Queen Street Lot',
    type: 'lot',
    totalSpots: 75,
    availableSpots: 28,
    lat: 44.2340,
    lng: -76.4830,
    address: 'Queen St & Clergy St',
  },
  {
    id: 'lot-d',
    name: 'Bagot Street Garage',
    type: 'lot',
    totalSpots: 120,
    availableSpots: 45,
    lat: 44.2325,
    lng: -76.4920,
    address: '188 Bagot St',
  },
];

export function getStatusColor(available: number, total: number): 'available' | 'low' | 'full' {
  if (available === 0) return 'full';
  const percentage = (available / total) * 100;
  if (percentage <= 20) return 'low';
  return 'available';
}

export function getStatusLabel(status: 'available' | 'low' | 'full'): string {
  switch (status) {
    case 'available': return 'Available';
    case 'low': return 'Limited';
    case 'full': return 'Full';
  }
}
