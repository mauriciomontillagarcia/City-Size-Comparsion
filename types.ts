
export interface CityBoundary {
  id: string;
  name: string;
  displayName: string;
  areaKm2: number;
  color: string;
  geojson: any; // GeoJSON geometry
  centroid: [number, number]; // [lat, lng]
  currentPosition: [number, number]; // [lat, lng] where it's currently rendered
}

export interface NominatimSearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  geojson?: any;
  address: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country: string;
  };
}

export interface ComparisonInsight {
  summary: string;
  funFacts: string[];
}
