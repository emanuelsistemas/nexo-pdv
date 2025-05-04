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
    <div className={`
      flex items-center bg-gray-800 border rounded-lg px-3 py-2 transition-all
      ${isFocused ? 'border-emerald-500' : 'border-gray-700'}
    `}>
      <Search className="h-5 w-5 text-gray-400 mr-2" />
      
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-gray-400"
      />
      
      {value && (
        <button
          onClick={handleClear}
          className="text-gray-400 hover:text-white focus:outline-none"
          type="button"
        >
          <XCircle className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
