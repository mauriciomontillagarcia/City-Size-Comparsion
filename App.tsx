
import React, { useState, useEffect, useCallback, useRef } from 'react';
import L from 'leaflet';
import SearchBox from './components/SearchBox';
import DraggableCity from './components/DraggableCity';
import { CityBoundary, NominatimSearchResult } from './types';
import { getCityComparisonInsights } from './services/geminiService';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
];

const App: React.FC = () => {
  const [selectedCities, setSelectedCities] = useState<CityBoundary[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [map, setMap] = useState<L.Map | null>(null);
  const [insights, setInsights] = useState<{ summary: string; funFacts: string[] } | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Check for API Key on mount
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        // Fallback for environments without aistudio (like local dev with .env)
        setHasApiKey(!!process.env.API_KEY);
      }
    };
    checkKey();
  }, []);

  const handleConnectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Assume success and proceed as per instructions
      setHasApiKey(true);
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || map) return;

    const initialMap = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 3,
      zoomControl: false,
      worldCopyJump: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(initialMap);

    L.control.zoom({ position: 'bottomright' }).addTo(initialMap);

    setMap(initialMap);

    return () => {
      initialMap.remove();
    };
  }, []);

  const handleCitySelect = useCallback((result: NominatimSearchResult) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const centroid: [number, number] = [parseFloat(result.lat), parseFloat(result.lon)];
    
    const color = COLORS[selectedCities.length % COLORS.length];

    const newCity: CityBoundary = {
      id: newId,
      name: result.display_name.split(',')[0],
      displayName: result.display_name,
      areaKm2: 0,
      color,
      geojson: result.geojson,
      centroid,
      currentPosition: centroid,
    };

    setSelectedCities(prev => [...prev, newCity]);
    setShowWelcome(false); // Hide welcome when a city is selected

    if (map) {
      map.flyTo(centroid, 10, { duration: 1.5 });
    }
  }, [selectedCities.length, map]);

  const handleDrag = useCallback((id: string, newPos: [number, number]) => {
    setSelectedCities(prev => prev.map(c => 
      c.id === id ? { ...c, currentPosition: newPos } : c
    ));
  }, []);

  const handleRemove = useCallback((id: string) => {
    setSelectedCities(prev => prev.filter(c => c.id !== id));
  }, []);

  const handleClearAll = () => {
    setSelectedCities([]);
    setInsights(null);
  };

  useEffect(() => {
    const updateInsights = async () => {
      if (selectedCities.length >= 2) {
        setIsLoadingInsights(true);
        try {
          const cityA = selectedCities[selectedCities.length - 2].name;
          const cityB = selectedCities[selectedCities.length - 1].name;
          const data = await getCityComparisonInsights(cityA, cityB);
          setInsights(data);
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoadingInsights(false);
        }
      } else {
        setInsights(null);
      }
    };
    updateInsights();
  }, [selectedCities.length]);

  return (
    <div className="flex flex-col h-screen w-full relative bg-slate-50 font-sans text-slate-900">
      {/* Background Map */}
      <div 
        ref={mapContainerRef} 
        className="absolute inset-0 z-0 h-full w-full"
      />

      {/* Floating Header */}
      <header className="absolute top-6 left-1/2 -translate-x-1/2 z-[2000] w-full max-w-4xl px-4 pointer-events-none">
        <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-3xl p-3 flex items-center justify-between pointer-events-auto transition-all hover:shadow-[0_8px_48px_rgba(0,0,0,0.15)]">
          <div className="flex items-center gap-4 pl-4 mr-6 shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold tracking-tight text-slate-800">City Size Comparison</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Global Footprints</p>
            </div>
          </div>

          <div className="flex-grow">
            <SearchBox onCitySelect={handleCitySelect} />
          </div>

          <div className="flex gap-2 ml-4 mr-1 shrink-0">
            {selectedCities.length > 0 && (
              <button 
                onClick={handleClearAll}
                className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all rounded-2xl group"
                title="Clear All"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Side Panels */}
      <div className="absolute left-6 top-32 bottom-10 z-[1001] w-80 flex flex-col gap-4 pointer-events-none overflow-hidden">
        {selectedCities.length > 0 && (
          <div className="bg-white/80 backdrop-blur-lg border border-white/50 p-5 rounded-[2rem] shadow-2xl pointer-events-auto animate-in slide-in-from-left-4 duration-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Active Layers</h2>
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{selectedCities.length}</span>
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
              {selectedCities.map((city) => (
                <div key={city.id} className="flex items-center justify-between group p-2 hover:bg-slate-50/50 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full shadow-sm" 
                      style={{ backgroundColor: city.color }}
                    />
                    <span className="text-sm font-semibold text-slate-700 truncate max-w-[140px]">{city.name}</span>
                  </div>
                  <button 
                    onClick={() => handleRemove(city.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {insights && (
          <div className="bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-lg border border-white/60 p-5 rounded-[2rem] shadow-2xl pointer-events-auto animate-in slide-in-from-left-4 fade-in duration-700 delay-150">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
              </div>
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Comparison AI</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-4 font-medium">
              {insights.summary}
            </p>
            <div className="space-y-3">
              {insights.funFacts.map((fact, idx) => (
                <div key={idx} className="text-xs text-slate-500 flex gap-3 p-2 bg-white/40 rounded-xl border border-white/60">
                  <span className="text-amber-500 font-bold">★</span>
                  <span className="leading-tight">{fact}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoadingInsights && (
          <div className="bg-white/40 backdrop-blur-md p-6 rounded-[2rem] shadow-lg animate-pulse pointer-events-none flex flex-col gap-3">
            <div className="h-2 bg-slate-200 rounded-full w-1/2"></div>
            <div className="h-2 bg-slate-100 rounded-full w-full"></div>
            <div className="h-2 bg-slate-100 rounded-full w-3/4"></div>
            <div className="h-2 bg-slate-100 rounded-full w-5/6 mt-2"></div>
          </div>
        )}
      </div>

      {/* Map Components */}
      {map && selectedCities.map(city => (
        <DraggableCity 
          key={city.id} 
          city={city} 
          map={map} 
          onDrag={handleDrag}
          onRemove={handleRemove}
        />
      ))}

      {/* Initial Landing UI */}
      {selectedCities.length === 0 && showWelcome && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1001] text-center max-w-sm pointer-events-none px-6">
           <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[3rem] shadow-[0_32px_64px_rgba(0,0,0,0.1)] border border-white relative pointer-events-auto">
             <button 
                onClick={() => setShowWelcome(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                title="Close"
             >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
             </button>
             
             <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
               <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <rect x="4" y="4" width="12" height="12" rx="2" strokeWidth="2" />
                 <rect x="8" y="8" width="12" height="12" rx="2" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
               </svg>
             </div>
             <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">World City Comparison</h2>
             <p className="text-slate-500 leading-relaxed font-medium mb-8">
               Search for cities above to visualize their geographic footprints. Drag them across the map to see how they truly compare in size.
             </p>

             {!hasApiKey ? (
               <div className="space-y-4">
                 <button 
                   onClick={handleConnectKey}
                   className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-3 group"
                 >
                   <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                     <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                     <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                     <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                     <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                   </svg>
                   Conectar con Google
                 </button>
                 <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                   Necesitas conectar tu cuenta para poder usar esta herramienta que funciona con Google Gemini, no se guardarán tus datos.
                 </p>
               </div>
             ) : (
               <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                 IA Conectada
               </div>
             )}
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
