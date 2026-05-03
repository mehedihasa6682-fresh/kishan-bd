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
      className="fixed inset-0 z-[9999] bg-white flex flex-col md:max-w-md md:mx-auto md:relative md:h-[90vh] md:rounded-[2.5rem] md:shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[1001] p-4 flex items-center justify-between">
        <button 
          onClick={onClose}
          className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-700 active:scale-95 transition-all"
        >
          <X size={20} />
        </button>
        <div className="relative flex-1 mx-4">
             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={16} />
             </div>
             <input 
                placeholder="Search location..."
                className="w-full bg-white/90 backdrop-blur-md rounded-2xl py-2.5 pl-10 pr-4 text-xs shadow-lg border border-slate-100 outline-none focus:border-primary"
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
          className="absolute bottom-20 right-4 z-[1001] w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-primary active:scale-95 transition-all"
        >
          <Navigation2 size={24} className={locating ? 'animate-pulse' : ''} />
        </button>

        {/* Manual Input Toggle Button */}
        <button 
          onClick={() => setManualMode(!manualMode)}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1001] bg-[#FF0000] text-white px-6 py-2.5 rounded-full font-bold text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {manualMode ? <MapIcon size={16} /> : <Search size={16} />}
          {manualMode ? 'Use Map' : 'Manual Input'}
        </button>
      </div>

      {/* Form Section (Bottom Sheet Style) */}
      <div className="flex-1 bg-white rounded-t-[2.5rem] -mt-8 relative z-[1002] shadow-[0_-10px_30px_rgba(0,0,0,0.05)] px-6 pt-8 pb-10 overflow-y-auto no-scrollbar">
        <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-6"></div>
        
        <h3 className="text-xl font-display font-bold text-slate-800 mb-6">Address Type</h3>
        
        {/* Address Type Selectors */}
        <div className="flex gap-3 mb-8">
          {[
            { id: 'Home', icon: Home },
            { id: 'Office', icon: Briefcase },
            { id: 'Other', icon: MoreHorizontal }
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setData(prev => ({ ...prev, type: type.id as any }))}
              className={`flex-1 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all border ${
                data.type === type.id 
                ? 'bg-[#FFD700] border-[#FFD700] text-slate-900 shadow-lg shadow-yellow-400/20' 
                : 'bg-slate-50 border-slate-100 text-slate-500'
              }`}
            >
              <type.icon size={18} />
              <span className="text-xs">{type.id}</span>
            </button>
          ))}
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  placeholder="John"
                  className="w-full bg-slate-50 border border-slate-100 px-10 py-3.5 rounded-2xl text-sm outline-none focus:border-primary transition-all font-medium"
                  value={data.firstName}
                  onChange={e => setData(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
              <input 
                placeholder="Doe"
                className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 rounded-2xl text-sm outline-none focus:border-primary transition-all font-medium"
                value={data.lastName}
                onChange={e => setData(prev => ({ ...prev, lastName: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  placeholder="+880 1XXX-XXXXXX"
                  className="w-full bg-slate-50 border border-slate-100 px-10 py-3.5 rounded-2xl text-sm outline-none focus:border-primary transition-all font-medium"
                  value={data.phone}
                  onChange={e => setData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="email"
                  placeholder="john@example.com"
                  className="w-full bg-slate-50 border border-slate-100 px-10 py-3.5 rounded-2xl text-sm outline-none focus:border-primary transition-all font-medium"
                  value={data.email}
                  onChange={e => setData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Address</label>
            <textarea 
              placeholder={loading ? 'Detecting address...' : 'Sector, Road, House No...'}
              className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 rounded-2xl text-sm outline-none focus:border-primary transition-all font-medium h-20 resize-none"
              value={data.address}
              onChange={e => setData(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Floor No.</label>
              <div className="relative">
                <Building size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  placeholder="e.g. 4th"
                  className="w-full bg-slate-50 border border-slate-100 px-10 py-3.5 rounded-2xl text-sm outline-none focus:border-primary transition-all font-medium"
                  value={data.floorNo}
                  onChange={e => setData(prev => ({ ...prev, floorNo: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Apartment</label>
              <input 
                placeholder="e.g. 402"
                className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 rounded-2xl text-sm outline-none focus:border-primary transition-all font-medium"
                value={data.apartment}
                onChange={e => setData(prev => ({ ...prev, apartment: e.target.value }))}
              />
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-[#FFD700] hover:bg-yellow-500 text-slate-900 font-black py-5 rounded-[2rem] shadow-xl shadow-yellow-400/20 active:scale-95 transition-all mt-6"
          >
            Save Address
          </button>
        </div>
      </div>
    </motion.div>
  );
}
