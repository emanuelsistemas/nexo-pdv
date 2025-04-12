import React, { useState, useEffect } from 'react';

interface HumanVerificationProps {
  onVerified: () => void;
}

export const HumanVerification: React.FC<HumanVerificationProps> = ({ onVerified }) => {
  const [checked, setChecked] = useState(false);

  const handleVerify = () => {
    setChecked(true);
    
    setTimeout(() => {
      onVerified();
    }, 1000);
  };

  useEffect(() => {
    // Prevenir rolagem enquanto o modal estiver aberto
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-xl p-8 shadow-2xl border border-slate-700 max-w-md w-full mx-4 animate-fade-in">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-100 mb-2">Verificação de Segurança</h2>
          <p className="text-slate-300 mb-8">Por favor, confirme que você não é um robô clicando no checkbox abaixo.</p>
          
          <div className="flex justify-center mb-6">
            <button 
              onClick={handleVerify}
              disabled={checked}
              className={`w-12 h-12 rounded-md border-2 flex items-center justify-center transition-all duration-300 ${
                checked 
                  ? 'border-green-500 bg-green-500/20' 
                  : 'border-slate-500 hover:border-blue-400 hover:bg-slate-700'
              }`}
              aria-label="Verificar que sou humano"
            >
              {checked && (
                <svg 
                  className="w-8 h-8 text-green-500 animate-check" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="3" 
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          </div>
          
          <p className="text-slate-400 text-sm">
            Clique no checkbox para continuar para o dashboard
          </p>
        </div>
      </div>
    </div>
  );
};
