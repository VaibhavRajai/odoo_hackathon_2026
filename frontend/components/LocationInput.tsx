import React, { useState, useEffect, useRef } from "react";
import { MapPin, Loader2 } from "lucide-react";

interface Location {
  display_name: string;
  lat: string;
  lon: string;
}

interface Props {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  onSelect: () => void;
  iconColor: string;
}

export function LocationInput({ label, placeholder, value, onChange, onSelect, iconColor }: Props) {
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=in`);
      const data = await res.json();
      setSuggestions(data);
      setShowDropdown(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 500);
  };

  const handleSelect = (suggestion: Location) => {
    onChange(suggestion.display_name);
    setShowDropdown(false);
    onSelect();
  };

  return (
    <div className="space-y-2 relative" ref={wrapperRef}>
      <label className="flex items-center text-sm font-medium text-gray-700 dark:text-zinc-300">
        <MapPin className={`w-4 h-4 mr-2 ${iconColor}`} /> {label}
      </label>
      <div className="relative">
        <input 
          required 
          type="text" 
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none shadow-sm pr-10"
          value={value}
          onChange={handleInputChange}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
        />
        {loading && (
          <div className="absolute right-3 top-3">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li 
              key={i} 
              className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer border-b border-gray-100 dark:border-zinc-800 last:border-0 text-sm text-gray-700 dark:text-zinc-300 transition-colors"
              onClick={() => handleSelect(s)}
            >
              {s.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
