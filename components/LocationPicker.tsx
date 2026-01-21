'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
}

function LocationPickerComponent({ latitude, longitude, onLocationChange }: LocationPickerProps) {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    // Import Leaflet only on client side
    import('leaflet').then((leaflet) => {
      setL(leaflet.default);
    });
  }, []);

  useEffect(() => {
    if (!L || mapRef.current) return;

    // Fix for default marker icons
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });

    // Initialize map
    const map = L.map('location-picker-map').setView([latitude, longitude], 16);
    mapRef.current = map;

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add draggable marker
    const marker = L.marker([latitude, longitude], { draggable: true }).addTo(map);
    markerRef.current = marker;

    // Handle marker drag
    marker.on('dragend', function(e: any) {
      const position = marker.getLatLng();
      onLocationChange(
        Math.round(position.lat * 10000) / 10000,
        Math.round(position.lng * 10000) / 10000
      );
    });

    // Handle map click
    map.on('click', function(e: any) {
      marker.setLatLng(e.latlng);
      onLocationChange(
        Math.round(e.latlng.lat * 10000) / 10000,
        Math.round(e.latlng.lng * 10000) / 10000
      );
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [L]);

  // Update marker position when props change
  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapRef.current.setView([latitude, longitude], mapRef.current.getZoom());
    }
  }, [latitude, longitude]);

  if (!L) {
    return (
      <div className="h-[300px] bg-purple-900/30 rounded-xl flex items-center justify-center">
        <p className="text-purple-400">جاري تحميل الخريطة...</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <div id="location-picker-map" className="h-[300px] rounded-xl z-0" />
      <p className="absolute bottom-2 left-2 right-2 text-center text-white text-xs bg-black/60 rounded-lg py-1.5 px-2 z-10">
        📍 اسحب الدبوس أو اضغط على الخريطة لتحديد الموقع
      </p>
    </div>
  );
}

// Export as dynamic component to avoid SSR issues
export default dynamic(() => Promise.resolve(LocationPickerComponent), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] bg-purple-900/30 rounded-xl flex items-center justify-center">
      <p className="text-purple-400">جاري تحميل الخريطة...</p>
    </div>
  )
});
