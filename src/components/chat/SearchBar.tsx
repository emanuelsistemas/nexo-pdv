import React, { useState, useEffect, useRef } from 'react';
import { Search, XCircle } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  value, 
  onChange, 
  placeholder = 'Buscar conversas...' 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Efeito para focar no input quando valor muda externamente
  useEffect(() => {
    if (value && !isFocused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [value, isFocused]);

  // Função para limpar a busca
  const handleClear = () => {
    onChange('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={`w-full pl-10 pr-4 py-2 bg-[#2A2A2A] border border-gray-800 rounded-lg text-white placeholder-gray-500 ${isFocused ? 'focus:ring-2 focus:ring-emerald-500 focus:border-transparent' : ''}`}
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white focus:outline-none"
          type="button"
        >
          <XCircle className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
