import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Receipt, ArrowRight, Check, Shield, Zap, Clock, Users, BarChart, LogIn } from 'lucide-react';
import { Logo } from '../components/Logo';
import { isUserLoggedIn } from '../utils/authUtils';
import { openKioskWindow } from '../utils/windowUtils';

export default function Landing() {
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  
  useEffect(() => {
    // Verifica se o usuário está logado ao carregar a página
    const checkLoginStatus = () => {
      const isLogged = isUserLoggedIn();
      setUserLoggedIn(isLogged);
      console.log('Status de login verificado:', isLogged ? 'Logado' : 'Deslogado');
    };
    
    // Verifica o status inicial
    checkLoginStatus();
    
    // Configurar um listener para storage events (detecta mudanças no localStorage)
    const handleStorageChange = (event: StorageEvent) => {
      // Verifica se a alteração foi relacionada ao login state
      if (event.key === 'nexo_pdv_login_state' || event.key === null) {
        checkLoginStatus();
      }
    };
    
    // Verifica quando a página recebe foco (usuário retorna a esta aba)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkLoginStatus();
      }
    };
    
    // Configura um intervalo para verificar o status de login periodicamente
    // Isso é útil para casos onde o evento de storage não é disparado corretamente
    const intervalId = setInterval(checkLoginStatus, 5000); // Verifica a cada 5 segundos
    
    // Adiciona os event listeners
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkLoginStatus);
    
    // Limpa os event listeners ao desmontar o componente
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkLoginStatus);
    };
  }, []);
  
  // Função para abrir o dashboard para usuários já logados
  const handleReturnToSystem = () => {
    openKioskWindow(window.location.origin + '/dashboard');
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header/Nav */}
      <header className="fixed w-full top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center py-4">
            <Logo />
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-300 hover:text-white transition-colors">Recursos</a>
              <a href="#about" className="text-slate-300 hover:text-white transition-colors">Sobre</a>
            </nav>
            <div className="flex items-center gap-4">
              {userLoggedIn ? (
                <button
                  onClick={handleReturnToSystem}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <LogIn size={18} />
                  Retornar ao Sistema
                </button>
              ) : (
                <>
                  <Link 
                    to="/login"
                    className="text-slate-300 hover:text-white transition-colors"
                  >
                    Login
                  </Link>
                  <Link 
                    to="/register"
                    className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Começar Grátis
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 text-transparent bg-clip-text mb-6">
            Simplifique seu PDV com o Nexo
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-8">
            Sistema completo de PDV na nuvem para sua empresa. Controle vendas, estoque e finanças em um só lugar.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {userLoggedIn ? (
              <button 
                onClick={handleReturnToSystem}
                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white px-8 py-3 rounded-lg transition-all duration-200 font-medium shadow-lg shadow-green-500/25"
              >
                Acessar o Sistema
                <LogIn size={20} />
              </button>
            ) : (
              <Link 
                to="/register"
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-8 py-3 rounded-lg transition-all duration-200 font-medium shadow-lg shadow-blue-500/25"
              >
                Começar Agora
                <ArrowRight size={20} />
              </Link>
            )}
            <a 
              href="#demo"
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-8 py-3 rounded-lg transition-colors"
            >
              Ver Demo
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-200 mb-12">
            Tudo que você precisa em um só lugar
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <ShoppingCart className="text-blue-400" size={32} />,
                title: "PDV Intuitivo",
                description: "Interface moderna e fácil de usar para agilizar suas vendas"
              },
              {
                icon: <Shield className="text-blue-400" size={32} />,
                title: "Segurança",
                description: "Seus dados protegidos com a mais alta tecnologia em nuvem"
              },
              {
                icon: <Zap className="text-blue-400" size={32} />,
                title: "Performance",
                description: "Sistema rápido e responsivo para não te deixar na mão"
              },
              {
                icon: <Clock className="text-blue-400" size={32} />,
                title: "Tempo Real",
                description: "Atualizações instantâneas de vendas e estoque"
              },
              {
                icon: <Users className="text-blue-400" size={32} />,
                title: "Multi-usuário",
                description: "Controle de acesso e permissões por usuário"
              },
              {
                icon: <BarChart className="text-blue-400" size={32} />,
                title: "Relatórios",
                description: "Análises detalhadas para tomar as melhores decisões"
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="bg-slate-800 p-6 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-slate-200 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <Logo />
              <p className="text-slate-400 mt-4">
                Sistema completo de PDV na nuvem para sua empresa.
              </p>
            </div>
            <div>
              <h4 className="text-slate-200 font-semibold mb-4">Produto</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#features" className="text-slate-400 hover:text-slate-300 transition-colors">
                    Recursos
                  </a>
                </li>
                <li>
                  <a href="#demo" className="text-slate-400 hover:text-slate-300 transition-colors">
                    Demo
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-slate-200 font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#about" className="text-slate-400 hover:text-slate-300 transition-colors">
                    Sobre
                  </a>
                </li>
                <li>
                  <a href="#contact" className="text-slate-400 hover:text-slate-300 transition-colors">
                    Contato
                  </a>
                </li>
                <li>
                  <a href="#blog" className="text-slate-400 hover:text-slate-300 transition-colors">
                    Blog
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-slate-200 font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#privacy" className="text-slate-400 hover:text-slate-300 transition-colors">
                    Privacidade
                  </a>
                </li>
                <li>
                  <a href="#terms" className="text-slate-400 hover:text-slate-300 transition-colors">
                    Termos
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-12 pt-8 text-center">
            <p className="text-slate-400">
              Desenvolvido por{' '}
              <a 
                href="https://emasoftware.io" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="font-['MuseoModerno'] bg-gradient-to-r from-blue-400 to-cyan-300 text-transparent bg-clip-text hover:from-blue-300 hover:to-cyan-200 transition-all duration-300"
              >
                ema-software
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}