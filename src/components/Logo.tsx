import React from 'react';
import { Receipt, ShoppingCart } from 'lucide-react';

interface LogoProps {
  variant?: 'login' | 'dashboard';
}

export function Logo({ variant = 'login' }: LogoProps) {
  if (variant === 'dashboard') {
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
}