import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import { closeWindow } from '../utils/windowUtils';
import { clearLoginState } from '../utils/authUtils';
import LogoutOverlay from './LogoutOverlay';

interface AppFooterProps {}

export const AppFooter: React.FC<AppFooterProps> = () => {
  const [showLogoutOverlay, setShowLogoutOverlay] = useState(false);

  const handleLogout = () => {
    setShowLogoutOverlay(true);
    
    // Logout no Supabase
    supabase.auth.signOut().then(() => {
      clearLoginState();
      
      // Fechar janela após logout
      setTimeout(() => {
        closeWindow();
      }, 1000);
    }).catch(error => {
      console.error('Erro ao fazer logout:', error);
      setShowLogoutOverlay(false);
      toast.error('Erro ao fazer logout');
    });
  };
  
  return (
    <>
      <LogoutOverlay visible={showLogoutOverlay} />
      
      <footer className="bg-slate-800 border-t border-slate-700">
        <div className="flex items-center justify-end py-[5px] px-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 py-1 px-3 rounded transition-colors"
          >
            <LogOut size={16} />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </footer>
    </>
  );
};
