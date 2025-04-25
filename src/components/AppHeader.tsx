import { useState, useRef, useEffect } from 'react';
import { Bell, Bug, LogOut, User, Key, Moon, Sun, Menu, Maximize2, Minimize2 } from 'lucide-react';
import { useTheme } from '../App';
import { Logo } from './Logo';

interface AppHeaderProps {
  userName?: string;
  companyName?: string;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onLogout?: () => void;
  onShowMobileMenu?: () => void;
  onShowLogoutConfirm?: () => void;
}

export function AppHeader({
  userName = '',
  companyName = '',
  onToggleFullscreen,
  isFullscreen = false,
  onLogout,
  onShowMobileMenu,
  onShowLogoutConfirm
}: AppHeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();


  // Fechar menu de usuário quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Verificar se o elemento clicado é o botão do usuário ou seus filhos
      const userButtonElement = document.getElementById('user-menu-button');
      if (userButtonElement && userButtonElement.contains(event.target as Node)) {
        return; // Não faz nada se o clique foi no botão de usuário
      }

      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node) && showUserMenu) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const handleFullscreenToggle = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else if (onShowLogoutConfirm) {
      onShowLogoutConfirm();
    }
  };

  const handleMobileMenuToggle = () => {
    if (onShowMobileMenu) {
      onShowMobileMenu();
    }
  };

  return (
    <header className="bg-slate-800 border-b border-slate-700 py-2 px-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleMobileMenuToggle}
            className="md:hidden text-slate-300 hover:text-white"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <Logo variant="dashboard" />
            <span className="text-slate-300 hidden sm:inline">|</span>
            <span className="text-slate-300 hidden sm:inline">{companyName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => alert('Relatório de bugs - Em desenvolvimento')}
            className="text-slate-300 hover:text-white hidden md:flex items-center justify-center p-2 rounded-lg hover:bg-slate-700 transition-colors"
            title="Reportar um problema"
          >
            <Bug size={18} />
          </button>

          <button
            onClick={() => alert('Notificações - Em desenvolvimento')}
            className="text-slate-300 hover:text-white hidden md:flex items-center justify-center p-2 rounded-lg hover:bg-slate-700 transition-colors"
            title="Notificações"
          >
            <Bell size={18} />
          </button>

          <button
            onClick={handleFullscreenToggle}
            className="text-slate-300 hover:text-white flex items-center justify-center p-2 rounded-lg hover:bg-slate-700 transition-colors"
            title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          <div className="relative">
            <button
              id="user-menu-button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors relative"
            >
              <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
                <User size={16} />
              </div>
              <span className="text-slate-200 text-sm font-medium md:block">{userName}</span>
            </button>
            
            {showUserMenu && (
              <div 
                ref={userMenuRef}
                className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden z-10">
                <ul>
                  <li>
                    <button
                      onClick={() => alert('Perfil do usuário - Em desenvolvimento')}
                      className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      <User size={16} />
                      <span>Perfil de usuário</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => alert('Alterar senha - Em desenvolvimento')}
                      className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      <Key size={16} />
                      <span>Alterar senha</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={toggleTheme}
                      className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                      <span>{theme === 'dark' ? "Modo claro" : "Modo escuro"}</span>
                    </button>
                  </li>
                  <li className="border-t border-slate-700">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 transition-colors"
                    >
                      <LogOut size={16} />
                      <span>Sair</span>
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
