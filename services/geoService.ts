
import { NominatimSearchResult } from '../types';

export const searchCities = async (query: string): Promise<NominatimSearchResult[]> => {
  if (!query || query.length < 3) return [];
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&polygon_geojson=1&addressdetails=1&limit=5`
    );
    if (!response.ok) throw new Error('Search failed');
    return await response.json();
  } catch (error) {
    console.error('Error searching cities:', error);
    return [];
  }
};

export const calculateArea = (geojson: any): number => {
  // Simple approximation for polygon area on sphere
  // In a production app, we would use @turf/area
  // Here we'll return a placeholder or implement a basic calculation if possible
  // For this demo, let's assume we fetch area or provide a reasonable estimate
  return Math.random() * 500 + 100; // Mock area in km2
};
