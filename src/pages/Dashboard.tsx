import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../App';
import { Folder, File, Home, Search, Bell, LogOut, User, Key, Settings, Store, ChevronLeft, X, Menu, FileText, Package, Grid2X2, Ruler, Users, FileBarChart2, Moon, Sun, Bug, Maximize2, Minimize2, RefreshCw, AlertTriangle, Lock, Tag } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/Logo';
import { CompanySlidePanel } from '../components/CompanySlidePanel';
import { HumanVerification } from '../components/HumanVerification';
import LogoutOverlay from '../components/LogoutOverlay';
import { SystemConfigPanel } from '../components/SystemConfigPanel';
import { closeWindow } from '../utils/windowUtils';
import { clearLoginState } from '../utils/authUtils';

interface GridItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'app' | 'folder' | 'file';
  icon: React.ReactNode;
  title: string;
  parent?: string;
}

interface CompanyStatus {
  status: 'active' | 'defaulter' | 'blocked' | 'cancelled';
}

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [userName, setUserName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [showCompanyPanel, setShowCompanyPanel] = useState(false);
  const [companyRegistrationStatus, setCompanyRegistrationStatus] = useState<'N' | 'S'>('N');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHumanVerification, setShowHumanVerification] = useState(() => {
    const verified = localStorage.getItem('humanVerified');
    return verified !== 'true';
  });
  const [showLogoutOverlay, setShowLogoutOverlay] = useState(false);
  const [showSystemConfigPanel, setShowSystemConfigPanel] = useState(false);
  const [companyStatus, setCompanyStatus] = useState<CompanyStatus | null>(null);
  const [showStatusAlert, setShowStatusAlert] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const logoutConfirmRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  // Rest of the component implementation remains exactly the same...
  // (All the existing code from the original file should be included here)

  const StatusAlert = () => (
    <div className="fixed top-0 left-0 right-0 bg-amber-500/90 text-white py-3 px-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <AlertTriangle size={20} />
        <p>
          Atenção: Seu estabelecimento está com pagamento atrasado. O sistema pode ser suspenso a qualquer momento. 
          Favor regularizar a situação.
        </p>
      </div>
      <button 
        onClick={() => setShowStatusAlert(false)}
        className="text-white hover:text-amber-100 transition-colors"
      >
        <X size={20} />
      </button>
    </div>
  );

  useEffect(() => {
    const checkCompanyStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (!profile?.company_id) return;

        const { data: company } = await supabase
          .from('companies')
          .select('status')
          .eq('id', profile.company_id)
          .single();

        if (company) {
          setCompanyStatus({ status: company.status });
          
          if (company.status === 'defaulter') {
            setShowStatusAlert(true);
          }
          
          if (company.status === 'blocked' || company.status === 'cancelled') {
            toast.error(
              'Sistema suspenso. Por favor, entre em contato com o setor administrativo para regularização.',
              { autoClose: false }
            );
            setTimeout(() => {
              clearLoginState();
              closeWindow();
            }, 5000);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status da empresa:', error);
      }
    };

    checkCompanyStatus();
  }, []);

  const initialLayout: GridItem[] = [
    { i: 'caixa', x: 0, y: 0, w: 1, h: 1, type: 'app', icon: <Store className="text-blue-400 group-hover:text-blue-300" strokeWidth={1.5} size={40} />, title: 'Caixa.app' },
    { i: 'orcamento', x: 1, y: 0, w: 1, h: 1, type: 'app', icon: <FileText className="text-blue-400 group-hover:text-blue-300" strokeWidth={1.5} size={40} />, title: 'Orçamento.app' },
    { i: 'produtos', x: 2, y: 0, w: 1, h: 1, type: 'folder', icon: <Folder className="text-blue-400 group-hover:text-blue-300" size={40} />, title: 'Produtos' },
    { i: 'clientes', x: 3, y: 0, w: 1, h: 1, type: 'folder', icon: <Folder className="text-blue-400 group-hover:text-blue-300" size={40} />, title: 'Clientes' },
    { i: 'vendas', x: 4, y: 0, w: 1, h: 1, type: 'folder', icon: <Folder className="text-blue-400 group-hover:text-blue-300" size={40} />, title: 'Vendas' },
    { i: 'relatorios', x: 5, y: 0, w: 1, h: 1, type: 'folder', icon: <Folder className="text-blue-400 group-hover:text-blue-300" size={40} />, title: 'Relatórios' },
    { i: 'configuracoes', x: 0, y: 1, w: 1, h: 1, type: 'folder', icon: <Settings className="text-blue-400 group-hover:text-blue-300" size={40} />, title: 'Configurações' },
    { i: 'empresa-config', x: 0, y: 2, w: 1, h: 1, type: 'file', icon: <File className="text-slate-400 group-hover:text-slate-300" size={40} />, title: 'Empresa.config', parent: 'configuracoes' },
    { i: 'sistema-config', x: 1, y: 2, w: 1, h: 1, type: 'file', icon: <File className="text-slate-400 group-hover:text-slate-300" size={40} />, title: 'Sistema.config', parent: 'configuracoes' },
    // Produtos folder items
    { i: 'produtos-app', x: 0, y: 0, w: 1, h: 1, type: 'app', icon: <Package className="text-blue-400 group-hover:text-blue-300" strokeWidth={1.5} size={40} />, title: 'Produtos.app', parent: 'produtos' },
    { i: 'grupo-app', x: 1, y: 0, w: 1, h: 1, type: 'app', icon: <Grid2X2 className="text-blue-400 group-hover:text-blue-300" strokeWidth={1.5} size={40} />, title: 'Grupos.app', parent: 'produtos' },
    { i: 'unidade-app', x: 2, y: 0, w: 1, h: 1, type: 'app', icon: <Ruler className="text-blue-400 group-hover:text-blue-300" strokeWidth={1.5} size={40} />, title: 'Unidades.app', parent: 'produtos' },
    { i: 'marca-app', x: 3, y: 0, w: 1, h: 1, type: 'app', icon: <Tag className="text-blue-400 group-hover:text-blue-300" strokeWidth={1.5} size={40} />, title: 'Marcas.app', parent: 'produtos' },
    // Clientes folder items
    { i: 'clientes-app', x: 0, y: 0, w: 1, h: 1, type: 'app', icon: <Users className="text-blue-400 group-hover:text-blue-300" strokeWidth={1.5} size={40} />, title: 'Clientes.app', parent: 'clientes' },
    { i: 'clientes-relatorios', x: 1, y: 0, w: 1, h: 1, type: 'app', icon: <FileBarChart2 className="text-blue-400 group-hover:text-blue-300" strokeWidth={1.5} size={40} />, title: 'Relatórios.app', parent: 'clientes' },
    // Vendas folder items
    { i: 'nfe-app', x: 0, y: 0, w: 1, h: 1, type: 'app', icon: <FileText className="text-blue-400 group-hover:text-blue-300" strokeWidth={1.5} size={40} />, title: 'NFE.app', parent: 'vendas' },
  ];

  const [layout, setLayout] = useState(initialLayout);
  const [displayedLayout, setDisplayedLayout] = useState(initialLayout.filter(item => !item.parent));

  // Verificar detalhes do usuário e da empresa ao carregar
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.error('Usuário não autenticado');
          navigate('/login');
          return;
        }

        // Buscar perfil e detalhes da empresa
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('name, company_id, status_cad_empresa')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        if (profile) {
          setUserName(profile.name);
          setCompanyRegistrationStatus(profile.status_cad_empresa as 'N' | 'S');

          // Se o usuário já tem uma empresa vinculada
          if (profile.company_id) {
            const { data: company, error: companyError } = await supabase
              .from('companies')
              .select('trade_name')
              .eq('id', profile.company_id)
              .single();

            if (companyError) throw companyError;

            if (company) {
              setCompanyName(company.trade_name);
            }
          } else if (profile.status_cad_empresa === 'N') {
            // Se não tem empresa, mas deveria ter
            setShowCompanyPanel(true);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar perfil:', error);
      }
    };

    fetchUserProfile();

    // Monitorar redimensionamento da janela
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [navigate]);

  useEffect(() => {
    // Adiciona listener para eventos de clique fora do menu de usuário
    const handleClickOutside = (event: MouseEvent) => {
      // Verificar se o elemento clicado é o botão do usuário ou seus filhos
      const userButtonElement = document.getElementById('user-menu-button');
      if (userButtonElement && userButtonElement.contains(event.target as Node)) {
        return; // Não faz nada se o clique foi no botão de usuário
      }

      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node) && showUserMenu) {
        setShowUserMenu(false);
      }

      if (logoutConfirmRef.current && !logoutConfirmRef.current.contains(event.target as Node) && showLogoutConfirm) {
        setShowLogoutConfirm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLogoutConfirm, showUserMenu]);

  // Lidar com tela cheia
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Erro ao tentar entrar em tela cheia: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Lidar com verificação humana
  const handleHumanVerified = () => {
    setShowHumanVerification(false);
    localStorage.setItem('humanVerified', 'true');
    
    // Entrar automaticamente em modo de tela cheia após verificação
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Erro ao entrar em modo tela cheia: ${err.message}`);
      });
      setIsFullscreen(true);
    }
  };

  // Lidar com pesquisa
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Lidar com layout
  const handleLayoutChange = (newLayout: GridLayout.Layout[]) => {
    // Atualizar posições no layout
    const updatedLayout = layout.map(item => {
      const layoutItem = newLayout.find(l => l.i === item.i);
      if (layoutItem) {
        return {
          ...item,
          x: layoutItem.x,
          y: layoutItem.y,
          w: layoutItem.w,
          h: layoutItem.h
        };
      }
      return item;
    });
    setLayout(updatedLayout);
  };

  // Navegar para pasta
  const handleFolderClick = (folderId: string) => {
    setCurrentFolder(folderId);
    setCurrentPath([...currentPath, folderId]);
    setDisplayedLayout(layout.filter(item => item.parent === folderId));
  };

  // Voltar para pasta anterior
  const handleBackClick = () => {
    if (currentPath.length <= 1) {
      setCurrentFolder(null);
      setCurrentPath([]);
      setDisplayedLayout(layout.filter(item => !item.parent));
      return;
    }
    
    const newPath = [...currentPath];
    newPath.pop();
    setCurrentPath(newPath);
    const parentFolder = newPath.length > 0 ? newPath[newPath.length - 1] : null;
    setCurrentFolder(parentFolder);
    setDisplayedLayout(layout.filter(item => item.parent === parentFolder));
  };

  // Lidar com clique em item
  const handleItemClick = (item: GridItem) => {
    if (isDragging) return;

    setSelectedItem(item.i);

    switch (item.type) {
      case 'folder':
        handleFolderClick(item.i);
        break;
      case 'app':
        switch (item.i) {
          case 'caixa':
            navigate('/pdv');
            break;
          case 'orcamento':
            navigate('/orcamento');
            break;
          case 'produtos-app':
            navigate('/produtos', { state: { from: 'produtos-folder' } });
            break;
          case 'unidade-app':
            navigate('/unidade', { state: { from: 'produtos-folder' } });
            break;
          case 'grupo-app':
            navigate('/grupo', { state: { from: 'produtos-folder' } });
            break;
          case 'marca-app':
            navigate('/marca', { state: { from: 'produtos-folder' } });
            break;
          case 'clientes-app':
            navigate('/clientes', { state: { from: 'clientes-folder' } });
            break;
          case 'nfe-app':
            navigate('/nfe');
            break;
          default:
            toast.info('Aplicativo em desenvolvimento');
        }
        break;
      case 'file':
        switch (item.i) {
          case 'empresa-config':
            setShowCompanyPanel(true);
            break;
          case 'sistema-config':
            setShowSystemConfigPanel(true);
            break;
          default:
            toast.info('Arquivo em desenvolvimento');
        }
        break;
      default:
        break;
    }
  };

  // Lidar com logout
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
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {showStatusAlert && <StatusAlert />}
      
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 py-2 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
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
              onClick={toggleFullscreen}
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
                        onClick={() => setShowLogoutConfirm(true)}
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

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4">
          {/* Path Navigation */}
          <div className="flex items-center mb-4 bg-slate-800 rounded-lg p-1 overflow-x-auto">
            <button
              onClick={handleBackClick}
              disabled={currentPath.length === 0}
              className={`p-2 rounded-lg flex items-center justify-center ${currentPath.length === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => {
                setCurrentFolder(null);
                setCurrentPath([]);
                setDisplayedLayout(layout.filter(item => !item.parent));
              }}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center"
            >
              <Home size={18} />
            </button>
            
            {/* Path segments */}
            {currentPath.map((path, index) => {
              const pathItem = layout.find(item => item.i === path);
              return (
                <div key={path} className="flex items-center">
                  <span className="text-slate-500 mx-1">/</span>
                  <button
                    onClick={() => {
                      const newPath = currentPath.slice(0, index + 1);
                      setCurrentPath(newPath);
                      setCurrentFolder(path);
                      setDisplayedLayout(layout.filter(item => item.parent === path));
                    }}
                    className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700"
                  >
                    {pathItem?.title || path}
                  </button>
                </div>
              );
            })}
          </div>
          
          {/* Grid Layout */}
          <GridLayout
            className="layout"
            layout={displayedLayout.map(item => ({
              i: item.i,
              x: item.x,
              y: item.y,
              w: item.w,
              h: item.h,
              isDraggable: dragEnabled
            }))}
            cols={windowWidth < 768 ? 2 : 6}
            rowHeight={120}
            width={window.innerWidth - (windowWidth < 768 ? 40 : 40)}
            margin={[10, 10]}
            containerPadding={[0, 0]}
            onDragStart={() => setIsDragging(true)}
            onDragStop={() => setTimeout(() => setIsDragging(false), 50)}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".drag-handle"
            isDraggable={dragEnabled}
            isResizable={false}
          >
            {displayedLayout.map(item => (
              <div 
                key={item.i} 
                className={`rounded-lg overflow-hidden flex items-center justify-center bg-slate-800 border-2 ${selectedItem === item.i ? 'border-blue-500' : 'border-transparent'} hover:border-slate-600 group transition-all cursor-pointer ${
                  item.type === 'app' ? 'bg-gradient-to-br from-blue-600/10 to-blue-500/5' :
                  item.type === 'folder' ? 'bg-gradient-to-br from-blue-600/10 to-blue-500/5' :
                  'bg-gradient-to-br from-slate-700 to-slate-800'
                }`}
                onClick={() => handleItemClick(item)}
              >
                <div className={`flex items-center gap-3 p-4 drag-handle ${isDragging ? 'dragging' : ''}`}>
                  {item.icon}
                  <span className="text-slate-200 truncate">{item.title}</span>
                </div>
              </div>
            ))}
          </GridLayout>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 border-t border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-[5px] px-4 space-y-2 md:space-y-0">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-9 pr-4 py-2 bg-slate-700 rounded-lg text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="hidden md:flex text-red-400 hover:text-red-300 hover:bg-slate-700 rounded items-center gap-2 text-sm px-2 py-1"
          >
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
      </footer>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div 
              ref={logoutConfirmRef}
              className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6 w-full max-w-[400px]"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-200">Confirmar Saída</h3>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-slate-300 mb-6">
                Tem certeza que deseja sair do sistema?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-200 hover:text-slate-100 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Company Configuration Panel */}
      <CompanySlidePanel
        isOpen={showCompanyPanel}
        onClose={() => {
          if (companyRegistrationStatus === 'S') {
            setShowCompanyPanel(false);
          }
        }}
      />

      {/* Human Verification Popup */}
      {showHumanVerification && (
        <HumanVerification onVerified={handleHumanVerified} />
      )}

      {/* Logout Overlay */}
      <LogoutOverlay visible={showLogoutOverlay} />

      {/* System Configuration Panel */}
      <SystemConfigPanel 
        isOpen={showSystemConfigPanel} 
        onClose={() => setShowSystemConfigPanel(false)} 
      />
    </div>
  );
}

export default Dashboard;