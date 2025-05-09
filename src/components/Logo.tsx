import React from 'react';
import { Link } from 'react-router-dom';
import { Receipt, ShoppingCart } from 'lucide-react';

interface LogoProps {
  variant?: 'login' | 'dashboard' | 'pdv';
  noLink?: boolean;
}

export function Logo({ variant = 'login', noLink = false }: LogoProps) {
  const LogoContent = () => {
    if (variant === 'dashboard' || variant === 'pdv') {
      return (
        <div className="flex items-center justify-center gap-1.5">
          <div className="relative">
            <ShoppingCart size={20} className="text-blue-400" />
            <Receipt size={15} className="absolute -right-1 -bottom-1 text-cyan-300" />
          </div>
          <h1 className="brand-name text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 text-transparent bg-clip-text">
            nexo pdv
          </h1>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center gap-3">
        <div className="relative">
          <ShoppingCart size={32} className="text-blue-400" />
          <Receipt size={24} className="absolute -right-1 -bottom-1 text-cyan-300" />
        </div>
        <h1 className="brand-name text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 text-transparent bg-clip-text">
          nexo pdv
        </h1>
      </div>
    );
  };

  // Se noLink for true ou se for Dashboard ou PDV, não criar link
  if (noLink || variant === 'dashboard' || variant === 'pdv') {
    return <LogoContent />;
  }
  
  // Caso contrário, manter o comportamento de link
  return (
    <Link to="/" className="hover:opacity-80 transition-opacity">
      <LogoContent />
    </Link>
  );
}