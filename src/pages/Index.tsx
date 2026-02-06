import { useState } from 'react';
import { MapView } from '@/components/MapView';
import { Sidebar } from '@/components/Sidebar';
import { ApiKeyPrompt } from '@/components/ApiKeyPrompt';
import { useParkingData } from '@/hooks/useParkingData';
import { ParkingLocation } from '@/data/parkingData';

export default function Index() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<ParkingLocation | null>(null);
  
  const {
    parkingData,
    lastUpdated,
    totalAvailable,
    totalSpots,
    streets,
    lots,
  } = useParkingData(10000);

  if (!apiKey) {
    return <ApiKeyPrompt onSubmit={setApiKey} />;
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <MapView
        parkingData={parkingData}
        selectedLocation={selectedLocation}
        onSelectLocation={setSelectedLocation}
        googleMapsApiKey={apiKey}
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