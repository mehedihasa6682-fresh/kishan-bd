import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Home, Briefcase, MoreHorizontal, User, Phone, Mail, Building, Map as MapIcon, X, Search, Navigation2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Fix Leaflet Default Icon 
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface AddressData {
  type: 'Home' | 'Office' | 'Other';
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  floorNo: string;
  apartment: string;
  lat: number;
  lng: number;
}

interface AddressPickerProps {
  onSave: (data: AddressData) => void;
  onClose: () => void;
  initialData?: Partial<AddressData>;
}

// Map Controller to handle programmatic moves (like search)
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center]);
  return null;
}

// Fixed Pin Component that stays in center
function MapPinOverlay() {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-[1000] pointer-events-none mb-1">
      <div className="relative group/pin">
        <MapPin size={40} className="text-[#FF0000] fill-[#FF0000]/20 drop-shadow-xl animate-bounce-slow" />
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-black/20 rounded-full blur-[1px]"></div>
      </div>
    </div>
  );
}

// Controller for map events
function LocationMarker({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  const map = useMapEvents({
    moveend() {
      const center = map.getCenter();
      onLocationChange(center.lat, center.lng);
    },
  });
  return null;
}

export default function AddressPicker({ onSave, onClose, initialData }: AddressPickerProps) {
  const [data, setData] = useState<AddressData>(() => ({
    type: 'Home',
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    address: initialData?.address || '',
    floorNo: initialData?.floorNo || '',
    apartment: initialData?.apartment || '',
    lat: Number(initialData?.lat) || 23.8103, // Ensure default if initialData lat is invalid
    lng: Number(initialData?.lng) || 90.4125,
  }));

  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-locate on mount
  useEffect(() => {
    locateMe();
  }, []);

  // Avoid overlapping requests and handle debouncing
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reverse Geocoding
  const fetchAddress = async (lat: number, lng: number, immediate = false) => {
    if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);

    const performFetch = async () => {
      setLoading(true);
      try {
        // Nominatim has a strict 1 request per second policy. 
        // We use a 1.5s debounce and handle fetches carefully.
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, {
          headers: {
            'Accept-Language': 'en'
          }
        });
        
        if (!response.ok) {
           if (response.status === 429) {
             console.warn('Geocoding rate limited. Using manual input fallback.');
             return;
           }
           throw new Error('Network response was not ok');
        }
        
        const result = await response.json();
        if (result && result.display_name) {
          setData(prev => ({ ...prev, address: result.display_name, lat, lng }));
        }
      } catch (error) {
        // "Failed to fetch" usually means rate limiting or network issues with Nominatim
        // We log it as a warning instead of an error to prevent console clutter
        console.warn('Geocoding service currently unavailable. Users can still type manually.');
      } finally {
        setLoading(false);
      }
    };

    if (immediate) {
      performFetch();
    } else {
      geocodeTimeoutRef.current = setTimeout(performFetch, 1500); // 1.5s debounce to strictly respect Nominatim policy
    }
  };

  const handleLocationChange = (lat: number, lng: number) => {
    fetchAddress(lat, lng);
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setData(prev => ({ ...prev, lat: latitude, lng: longitude }));
        fetchAddress(latitude, longitude, true); // Immediate fetch for auto-locate
        setLocating(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        // Don't alert on initial mount, only if user explicitly clicked
        if (locating) alert("Could not get your location. Please check permissions.");
        setLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSave = () => {
    if (!data.firstName || !data.phone || !data.address) {
      alert("Please fill in the required fields (First Name, Phone, Address)");
      return;
    }
    onSave(data);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col md:max-w-md md:mx-auto md:relative md:h-[90vh] md:rounded-[3rem] md:shadow-2xl overflow-hidden border-x border-white/5"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[1001] p-5 flex items-center justify-between">
        <button 
          onClick={onClose}
          className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-2xl shadow-xl flex items-center justify-center text-white border border-white/10 active:scale-95 transition-all"
        >
          <X size={24} />
        </button>
        <div className="relative flex-1 mx-4">
             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                <Search size={18} />
             </div>
             <input 
                placeholder="Search global grid..."
                className="w-full bg-black/40 backdrop-blur-md rounded-2xl py-3.5 pl-12 pr-4 text-xs shadow-2xl border border-white/10 outline-none focus:border-primary text-white font-medium"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                        if (!searchQuery.trim()) return;
                        setLoading(true);
                        try {
                            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`, {
                                headers: { 'Accept-Language': 'en' }
                            });
                            if (!res.ok) throw new Error('Search failed');
                            const results = await res.json();
                            if (results && results.length > 0) {
                                const first = results[0];
                                const lat = parseFloat(first.lat);
                                const lng = parseFloat(first.lon);
                                setData(prev => ({ ...prev, lat, lng, address: first.display_name }));
                            } else {
                                alert("Location not found. Try adding more details (City/Area).");
                            }
                        } catch (err) { 
                            console.error(err); 
                            alert("Unable to reach map service. Please check your connection or type address manually.");
                        } finally { setLoading(false); }
                    }
                }}
             />
        </div>
      </div>

      {/* Map Section */}
      <div className="relative h-[45%] w-full">
        <MapContainer 
          center={[data.lat, data.lng]} 
          zoom={16} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <MapController center={[data.lat, data.lng]} />
          <LocationMarker onLocationChange={handleLocationChange} />
        </MapContainer>
        <MapPinOverlay />
        
        {/* Current Location Button */}
        <button 
          onClick={locateMe}
          disabled={locating}
          className="absolute bottom-24 right-5 z-[1001] w-14 h-14 bg-primary rounded-2xl shadow-2xl flex items-center justify-center text-black active:scale-95 transition-all border-4 border-black"
        >
          <Navigation2 size={28} className={locating ? 'animate-pulse' : ''} />
        </button>

        {/* Manual Input Toggle Button */}
        <button 
          onClick={() => setManualMode(!manualMode)}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1001] bg-white/10 backdrop-blur-md text-white px-8 py-3.5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 border border-white/10"
        >
          {manualMode ? <MapIcon size={18} className="text-primary" /> : <Search size={18} className="text-primary" />}
          {manualMode ? 'View Terrain' : 'Manual Coordinates'}
        </button>
      </div>


      {/* Form Section (Bottom Sheet Style) */}
      <div className="flex-1 bg-zinc-950 rounded-t-[3.5rem] -mt-10 relative z-[1002] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] px-8 pt-10 pb-12 overflow-y-auto no-scrollbar border-t border-white/10">
        <div className="w-16 h-1.5 bg-white/10 rounded-full mx-auto mb-8"></div>
        
        <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-6 ml-1">Drop Zone Classification</h3>
        
        {/* Address Type Selectors */}
        <div className="flex gap-4 mb-10">
          {[
            { id: 'Home', icon: Home },
            { id: 'Office', icon: Briefcase },
            { id: 'Other', icon: MoreHorizontal }
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setData(prev => ({ ...prev, type: type.id as any }))}
              className={`flex-1 py-4 px-2 rounded-2xl flex flex-col items-center justify-center gap-2 font-black transition-all border ${
                data.type === type.id 
                ? 'bg-primary border-primary text-black shadow-2xl shadow-primary/20 scale-105' 
                : 'bg-white/5 border-white/5 text-white/40'
              }`}
            >
              <type.icon size={20} />
              <span className="text-[9px] uppercase tracking-widest">{type.id}</span>
            </button>
          ))}
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Personal Identifier</label>
              <div className="relative group">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
                <input 
                  placeholder="Receiver Name"
                  className="input-field pl-12"
                  value={data.firstName}
                  onChange={e => setData(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Signal Core (Phone)</label>
              <div className="relative group">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
                <input 
                  placeholder="017xxxxxxxx"
                  className="input-field pl-12"
                  value={data.phone}
                  onChange={e => setData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Digital Tag (Email)</label>
              <div className="relative group">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
                <input 
                  type="email"
                  placeholder="user@neuron.io"
                  className="input-field pl-12"
                  value={data.email}
                  onChange={e => setData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Sector Manifest (Address)</label>
            <textarea 
              placeholder={loading ? 'Scanning terrain...' : 'Sector, Road, Grid Coordinates...'}
              className="input-field h-28 resize-none leading-relaxed py-4"
              value={data.address}
              onChange={e => setData(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Elevation (Floor)</label>
              <div className="relative group">
                <Building size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
                <input 
                  placeholder="Level 04"
                  className="input-field pl-12"
                  value={data.floorNo}
                  onChange={e => setData(prev => ({ ...prev, floorNo: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Unit ID (Apartment)</label>
              <input 
                placeholder="ID-402"
                className="input-field px-6"
                value={data.apartment}
                onChange={e => setData(prev => ({ ...prev, apartment: e.target.value }))}
              />
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-black font-black py-5 rounded-[2.5rem] shadow-2xl shadow-primary/30 active:scale-95 transition-all mt-8 uppercase text-xs tracking-[0.3em]"
          >
            Authenticate Location
          </button>
        </div>
      </div>
    </motion.div>
  );
}
