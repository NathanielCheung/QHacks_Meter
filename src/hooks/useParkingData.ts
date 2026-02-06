import { useState, useEffect, useCallback } from 'react';
import { initialParkingData, ParkingLocation } from '@/data/parkingData';

export function useParkingData(updateInterval: number = 10000) {
  const [parkingData, setParkingData] = useState<ParkingLocation[]>(initialParkingData);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const simulateUpdate = useCallback(() => {
    setParkingData(currentData => 
      currentData.map(location => {
        // Random chance to change availability (30% chance)
        if (Math.random() > 0.3) return location;
        
        // Random change between -3 and +3 spots
        const change = Math.floor(Math.random() * 7) - 3;
        const newAvailable = Math.max(0, Math.min(location.totalSpots, location.availableSpots + change));
        
        return {
          ...location,
          availableSpots: newAvailable,
        };
      })
    );
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    const interval = setInterval(simulateUpdate, updateInterval);
    return () => clearInterval(interval);
  }, [simulateUpdate, updateInterval]);

  const totalAvailable = parkingData.reduce((sum, loc) => sum + loc.availableSpots, 0);
  const totalSpots = parkingData.reduce((sum, loc) => sum + loc.totalSpots, 0);
  
  const streets = parkingData.filter(loc => loc.type === 'street');
  const lots = parkingData.filter(loc => loc.type === 'lot');

  return {
    parkingData,
    lastUpdated,
    totalAvailable,
    totalSpots,
    streets,
    lots,
  };
}
