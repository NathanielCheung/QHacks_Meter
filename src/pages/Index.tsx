import { useState } from 'react';
import { MapView } from '@/components/MapView';
import { Sidebar } from '@/components/Sidebar';
import { useParkingData } from '@/hooks/useParkingData';
import { ParkingLocation } from '@/data/parkingData';

export default function Index() {
  const [selectedLocation, setSelectedLocation] = useState<ParkingLocation | null>(null);
  
  const {
    parkingData,
    lastUpdated,
    totalAvailable,
    totalSpots,
    streets,
    lots,
  } = useParkingData(10000);

  return (
    <div className="h-screen flex overflow-hidden">
      <MapView
        parkingData={parkingData}
        selectedLocation={selectedLocation}
        onSelectLocation={setSelectedLocation}
      />
      <Sidebar
        streets={streets}
        lots={lots}
        totalAvailable={totalAvailable}
        totalSpots={totalSpots}
        lastUpdated={lastUpdated}
        selectedLocation={selectedLocation}
        onSelectLocation={setSelectedLocation}
      />
    </div>
  );
}
