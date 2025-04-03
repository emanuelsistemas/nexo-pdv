import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../App';
import { Folder, File, Home, Search, Bell, LogOut, User, Key, Settings, Store, ChevronLeft, X, Menu, FileText, Package, Grid2X2, Ruler, Cog, Users, FileBarChart2, Moon, Sun } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/Logo';
import { CompanySlidePanel } from '../components/CompanySlidePanel';

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

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { theme, toggleTheme } = useTheme();
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
  const userMenuRef = useRef<HTMLDivElement>(null);
  const logoutConfirmRef = useRef<HTMLDivElement>(null);

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
    { i: 'grupos-app', x: 1, y: 0, w: 1, h: 1, type: 'app', icon: <Grid2X2 className="text-blue-400 group-hover:text-blue-300" strokeWidth={1.5} size={40} />, title: 'Grupos.app', parent: 'produtos' },
    { i: 'unidade-app', x: 2, y: 0, w: 1, h: 1, type: 'app', icon: <Ruler className="text-blue-400 group-hover:text-blue-300" strokeWidth={1.5} size={40} />, title: 'Unidade.app', parent: 'produtos' },
    { i: 'produtos-config', x: 3, y: 0, w: 1, h: 1, type: 'file', icon: <Cog className="text-slate-400 group-hover:text-slate-300" size={40} />, title: 'Configuracao.config', parent: 'produtos' },
    // Clientes folder items
    { i: 'clientes-app', x: 0, y: 0, w: 1, h: 1, type: 'app', icon: <Users className="text-blue-400 group-hover:text-blue-300" strokeWidth={1.5} size={40} />, title: 'Clientes.app', parent: 'clientes' },
    { i: 'clientes-relatorios', x: 1, y: 0, w: 1, h: 1, type: 'app', icon: <FileBarChart2 className="text-blue-400 group-hover:text-blue-300" strokeWidth={1.5} size={40} />, title: 'Relatorios.app', parent: 'clientes' },
    { i: 'clientes-config', x: 2, y: 0, w: 1, h: 1, type: 'file', icon: <Cog className="text-slate-400 group-hover:text-slate-300" size={40} />, title: 'Configuracao.config', parent: 'clientes' }
  ];

  const [layout, setLayout] = useState(() => {
    const savedLayout = localStorage.getItem('gridLayout');
    return savedLayout ? JSON.parse(savedLayout) : initialLayout;
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, company_id, status_cad_empresa')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserName(profile.name);
          setCompanyRegistrationStatus(profile.status_cad_empresa);
          
          if (profile.company_id) {
            const { data: company } = await supabase
              .from('companies')
              .select('trade_name')
              .eq('id', profile.company_id)
              .single();
            
            if (company) {
              setCompanyName(company.trade_name);
            }
          }

          if (profile.status_cad_empresa === 'N') {
            setShowCompanyPanel(true);
          }
        }
      }
    };

    getProfile();

    // Verificar se há um estado para abrir uma pasta específica
    if (location.state && location.state.openFolder) {
      setCurrentFolder(location.state.openFolder);
    }

    const handleMouseUp = () => {
      setDragEnabled(false);
      setIsDragging(false);
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (logoutConfirmRef.current && !logoutConfirmRef.current.contains(event.target as Node)) {
        setShowLogoutConfirm(false);
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [location]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error: any) {
      toast.error('Erro ao sair: ' + error.message);
    }
  };

  const getGridCols = () => {
    if (windowWidth < 640) return 2; // Mobile
    if (windowWidth < 768) return 3; // Small tablet
    if (windowWidth < 1024) return 4; // Large tablet
    if (windowWidth < 1280) return 5; // Small desktop
    return 6; // Large desktop
  };

  const getGridWidth = () => {
    const padding = windowWidth < 640 ? 32 : 48; // Smaller padding on mobile
    return windowWidth - padding;
  };

  const handleLayoutChange = (newLayout: GridItem[]) => {
    if (!dragEnabled && !isDragging) return;
    
    try {
      // Cria um layout simplificado antes de processar
      const processedNewLayout = newLayout.map((item: any) => ({
        i: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h
      }));
      
      const updatedLayout = layout.map((item: GridItem) => {
        const newPos = processedNewLayout.find(l => l.i === item.i);
        if (!newPos) return item;
        
        return {
          ...item,
          x: newPos.x,
          y: newPos.y,
          w: newPos.w,
          h: newPos.h,
        };
      });
  
      setLayout(updatedLayout);
      
      // Cria uma versão simplificada para o localStorage
      const storageLayout = updatedLayout.map((item: GridItem) => {
        // Extrair apenas as propriedades necessárias
        return {
          i: item.i,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          type: item.type,
          title: item.title,
          parent: item.parent
        };
      });
      
      localStorage.setItem('gridLayout', JSON.stringify(storageLayout));
    } catch (error) {
      console.error('Erro ao processar layout:', error);
    }
  };

  const handleItemClick = (item: GridItem) => {
    if (isDragging) return;
    
    setSelectedItem(item.i);
    
    if (item.type === 'app') {
      if (item.i === 'caixa') {
        navigate('/pdv');
        return;
      } else if (item.i === 'orcamento') {
        navigate('/orcamento');
        return;
      } else if (item.i === 'produtos-app') {
        navigate('/produtos', { state: { from: 'produtos-folder' } });
        return;
      } else if (item.i === 'unidade-app') {
        navigate('/unidade', { state: { from: 'produtos-folder' } });
        return;
      } else if (item.i === 'grupos-app') {
        navigate('/grupo', { state: { from: 'produtos-folder' } });
        return;
      } else if (item.i === 'clientes-app') {
        navigate('/clientes', { state: { from: 'clientes-folder' } });
        return;
      }
    }
    
    if (item.type === 'folder') {
      setCurrentFolder(item.i);
      if (!currentPath.includes(item.title)) {
        setCurrentPath([item.title]);
      }
    } else if (item.type === 'file') {
      if (item.i === 'empresa-config') {
        setShowCompanyPanel(true);
      }
      const parentFolder = layout.find((l: GridItem) => l.i === item.parent);
      if (parentFolder) {
        setCurrentPath([parentFolder.title, item.title]);
      }
    }
  };

  const handleHomeClick = () => {
    setSelectedItem(null);
    setCurrentPath([]);
    setCurrentFolder(null);
    setSearchQuery('');
  };

  const handleBackClick = () => {
    setCurrentPath(prev => prev.slice(0, -1));
    setCurrentFolder(null);
  };

  const handleMainClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedItem(null);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (currentFolder) {
      setCurrentFolder(null);
      setCurrentPath([]);
    }
  };

  const filteredLayout: GridItem[] = layout.filter((item: GridItem) => {
    const searchMatch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (searchQuery) {
      return searchMatch;
    }
    
    if (!currentFolder) {
      return !item.parent;
    }
    return item.parent === currentFolder;
  });

  const cols = getGridCols();
  const organizedLayout = filteredLayout.map((item: GridItem, index: number) => ({
    ...item,
    x: index % cols,
    y: Math.floor(index / cols),
    w: 1,
    h: 1,
  }));

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="flex items-center justify-between h-12 px-4">
          <div className="flex items-center gap-6">
            <Logo variant="dashboard" />
            <div className="hidden md:flex items-center gap-2">
              <span className="text-slate-400 text-sm">Empresa:</span>
              <span className="text-slate-200 text-sm truncate max-w-[200px]">{companyName}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-1.5 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-700"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              <Menu size={24} />
            </button>
            <button className="p-1.5 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-700">
              <Bell size={18} />
            </button>
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-700 text-slate-200"
              >
                <User size={18} className="text-slate-400" />
                <span className="text-sm">{userName}</span>
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-lg border border-slate-700 py-1 z-50">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-slate-200 hover:bg-slate-700"
                  >
                    <User size={16} />
                    Perfil
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-slate-200 hover:bg-slate-700"
                  >
                    <Key size={16} />
                    Alterar Senha
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-slate-200 hover:bg-slate-700"
                  >
                    <Settings size={16} />
                    Configurações
                  </button>
                  <button
                    onClick={() => {
                      toggleTheme();
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2 text-slate-200 hover:bg-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                      <span>Tema {theme === 'dark' ? 'Escuro' : 'Claro'}</span>
                    </div>
                    <div className={`w-10 h-5 bg-slate-700 rounded-full p-1 transition-all duration-300 ${theme === 'light' ? 'bg-blue-600' : ''}`}>
                      <div className={`bg-white h-3 w-3 rounded-full transform transition-transform duration-300 ${theme === 'light' ? 'translate-x-5' : ''}`}></div>
                    </div>
                  </button>
                  <hr className="my-1 border-slate-700" />
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowLogoutConfirm(true);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-slate-700"
                  >
                    <LogOut size={16} />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="md:hidden bg-slate-800 border-b border-slate-700">
          <div className="p-4 space-y-2">
            <button
              onClick={() => {}}
              className="w-full flex items-center gap-2 px-4 py-2 text-slate-200 hover:bg-slate-700 rounded-lg"
            >
              <User size={18} />
              <span>{userName}</span>
            </button>
            <button
              onClick={() => {}}
              className="w-full flex items-center gap-2 px-4 py-2 text-slate-200 hover:bg-slate-700 rounded-lg"
            >
              <Bell size={18} />
              <span>Notificações</span>
            </button>
            <button
              onClick={() => {}}
              className="w-full flex items-center gap-2 px-4 py-2 text-slate-200 hover:bg-slate-700 rounded-lg"
            >
              <Settings size={18} />
              <span>Configurações</span>
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-slate-700 rounded-lg"
            >
              <LogOut size={18}/>
              <span>Sair</span>
            </button>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-stretch text-slate-400 px-4 h-[32px]">
          <button 
            onClick={handleHomeClick}
            className="flex items-center hover:text-slate-200 hover:bg-slate-700/50 transition-colors px-2"
          >
            <Home size={16} />
          </button>
          {currentPath.length > 0 && (
            <>
              <div className="flex items-center">
                <div className="h-full w-[1px] bg-slate-700 mx-2"></div>
              </div>
              {currentPath.map((path, index) => (
                <React.Fragment key={path}>
                  <div 
                    className={`flex items-center ${
                      index === currentPath.length - 1 
                        ? "text-slate-200" 
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 cursor-pointer"
                    } px-2 transition-colors`}
                    onClick={() => {
                      if (index === 0) {
                        handleHomeClick();
                      } else {
                        const folderName = currentPath[index - 1];
                        const folder = layout.find((item: GridItem) => item.title === folderName);
                        
                        if (folder) {
                          setCurrentFolder(folder.i);
                          setCurrentPath(prev => prev.slice(0, index));
                        }
                      }
                    }}
                  >
                    <span className="truncate max-w-[200px]">{path}</span>
                  </div>
                  {index < currentPath.length - 1 && (
                    <div className="flex items-center">
                      <div className="h-full w-[1px] bg-slate-700 mx-2"></div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6" onClick={handleMainClick}>
        {currentFolder && (
          <button
            onClick={handleBackClick}
            className="mb-4 flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ChevronLeft size={20} />
            <span>Voltar</span>
          </button>
        )}
        <div className="w-full overflow-x-hidden">
          <GridLayout
            className="layout"
            layout={organizedLayout}
            cols={cols}
            rowHeight={100}
            width={getGridWidth()}
            margin={[24, 24]}
            onLayoutChange={handleLayoutChange}
            isDraggable={dragEnabled}
            isResizable={false}
            draggableHandle=".drag-handle"
            containerPadding={[12, 12]}
            compactType="vertical"
            preventCollision={false}
          >
            {organizedLayout.map((item) => (
              <div 
                key={item.i} 
                className={`bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer group border border-slate-700 ${
                  selectedItem === item.i ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900' : ''
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
                  Cancelar
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
    </div>
  );
}

export default Dashboard;