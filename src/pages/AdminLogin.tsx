import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Loader2, Database, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Estado para o modal de verificação de dev
  const [showDevModal, setShowDevModal] = useState(false);
  const [devEmail, setDevEmail] = useState('');
  const [devPassword, setDevPassword] = useState('');
  const [devPasswordVisible, setDevPasswordVisible] = useState(false);
  const [verifyingDev, setVerifyingDev] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Função para abrir o modal de verificação de desenvolvedor - temporariamente desativada
  /*
  const handleRegisterClick = async () => {
    try {
      // Verificar se há usuários na tabela
      const { data: admins, error: checkError } = await supabase
        .from('profile_admin')
        .select('id')
        .limit(1);
      
      // Se não houver nenhum admin, permitir cadastro do primeiro
      if (checkError || !admins || admins.length === 0) {
        toast.info('Criando o primeiro administrador. Você será um desenvolvedor.');
        navigate('/admin/register');
        return;
      }
      
      // Se já existem admins, mostrar o modal de verificação
      setShowDevModal(true);
    } catch (error) {
      console.error('Erro ao verificar administradores:', error);
      toast.error('Erro ao verificar administradores');
    }
  };
  */
  
  // Função para verificar se o usuário é um desenvolvedor
  const verifyDevCredentials = async () => {
    try {
      setVerifyingDev(true);
      
      if (!devEmail || !devPassword) {
        toast.error('Por favor, informe email e senha');
        return;
      }
      
      // Verificar se o usuário existe e tem dev='S'
      const { data: adminData, error } = await supabase
        .from('profile_admin')
        .select('id, dev, senha, nome_fantasia, nome_usuario')
        .eq('email', devEmail)
        .single();
        
      if (error || !adminData) {
        toast.error('Email não encontrado');
        return;
      }
      
      if (adminData.senha !== devPassword) {
        toast.error('Senha incorreta');
        return;
      }
      
      if (adminData.dev !== 'S') {
        toast.error('Você não tem permissão para acessar esta área. Apenas administradores desenvolvedores podem acessar.');
        return;
      }
      
      // Se tudo estiver correto, criar a sessão e redirecionar
      localStorage.setItem('admin_session', JSON.stringify({
        id: adminData.id,
        email: devEmail,
        isAdmin: true,
        nome: adminData.nome_usuario,
        companyName: adminData.nome_fantasia || 'Nexo Sistema',
        timestamp: Date.now()
      }));
      
      toast.success('Permissão verificada! Redirecionando...');
      setShowDevModal(false);
      navigate('/admin/register');
    } catch (error) {
      console.error('Erro ao verificar credenciais:', error);
      toast.error('Erro ao verificar credenciais');
    } finally {
      setVerifyingDev(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      let userType = '';
      let userData = null;

      // Primeiro tenta buscar na tabela profile_admin (admins originais)
      const { data: admin } = await supabase
        .from('profile_admin')
        .select('*')
        .eq('email', formData.email)
        .maybeSingle();

      if (admin) {
        // Encontrou na tabela profile_admin
        if (admin.senha !== formData.password) {
          throw new Error('Credenciais inválidas');
        }
        userType = 'admin';
        userData = admin;
      } else {
        // Se não encontrou, busca na tabela profile_admin_user
        const { data: userAdmin } = await supabase
          .from('profile_admin_user')
          .select('*')
          .eq('email', formData.email)
          .eq('status', 'active') // Apenas usuários ativos podem fazer login
          .maybeSingle();

        if (!userAdmin) {
          throw new Error('Credenciais inválidas');
        }

        // Validar senha do usuário admin
        if (userAdmin.senha !== formData.password) {
          throw new Error('Credenciais inválidas');
        }
        
        userType = 'admin_user';
        userData = userAdmin;
      }
      
      // Não encontrou em nenhuma tabela ou senha inválida
      if (!userData) {
        throw new Error('Credenciais inválidas');
      }

      // Salvar sessão baseada no tipo de usuário
      if (userType === 'admin' && userData) {
        // Para admin, usamos o nome de usuário também como nome da empresa
        // já que removemos o campo nome_fantasia
        localStorage.setItem('admin_session', JSON.stringify({
          isAdmin: true,
          id: userData.id,
          email: userData.email,
          nome: userData.nome_usuario,
          companyName: userData.nome_usuario || 'Nexo Sistema',
          userType: 'admin',
          timestamp: Date.now()
        }));
      } else if (userType === 'admin_user' && userData) {
        // Buscar informações do admin vinculado para obter nome de usuário (agora usado como nome da empresa)
        const { data: adminInfo } = await supabase
          .from('profile_admin')
          .select('nome_usuario')
          .eq('id', userData.admin_id)
          .maybeSingle();
          
        // Defina um nome de empresa padrão se não conseguir encontrar
        const companyName = (adminInfo && adminInfo.nome_usuario) ? 
          adminInfo.nome_usuario : 'Nexo Sistema';
          
        localStorage.setItem('admin_session', JSON.stringify({
          isAdmin: true,
          id: userData.id,
          admin_id: userData.admin_id,
          email: userData.email,
          nome: userData.nome,
          tipo: userData.tipo,
          companyName: companyName,
          userType: 'admin_user',
          timestamp: Date.now()
        }));
      }

      toast.success('Login realizado com sucesso!');
      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      
      // Tratamento seguro do erro para exibição
      let errorMessage = 'Erro ao fazer login';
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#1C1C1C]">
      {/* Modal de verificação de desenvolvedor */}
      {showDevModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#2A2A2A] p-8 rounded-xl border border-gray-800 w-full max-w-md shadow-xl relative">
            <button 
              onClick={() => setShowDevModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
            
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white">Autenticação Necessária</h2>
              <p className="text-gray-400 mt-2">
                Apenas administradores com permissão de desenvolvedor podem acessar esta área.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-[#1C1C1C] border border-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                  placeholder="seu@email.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={devPasswordVisible ? "text" : "password"}
                    value={devPassword}
                    onChange={(e) => setDevPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-[#1C1C1C] border border-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setDevPasswordVisible(!devPasswordVisible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    {devPasswordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              
              <button
                onClick={verifyDevCredentials}
                disabled={verifyingDev}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {verifyingDev ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <span>Verificar Acesso</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="w-full max-w-md space-y-8 bg-[#2A2A2A] p-8 rounded-xl border border-gray-800">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Database className="w-10 h-10 text-emerald-500" />
            <h1 className="text-3xl font-bold text-white">Admin</h1>
          </div>
          <p className="text-gray-400">Área administrativa do sistema</p>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg bg-[#1C1C1C] border border-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
              placeholder="admin@exemplo.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-[#1C1C1C] border border-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Entrando...</span>
              </>
            ) : (
              <>
                <LogIn size={20} />
                <span>Entrar</span>
              </>
            )}
          </button>
          
          {/* Opção de cadastro temporariamente desativada
          <div className="mt-4">
            <button
              type="button"
              onClick={handleRegisterClick}
              className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2.5 px-4 rounded-lg transition-all duration-200 font-medium"
            >
              <UserPlus size={20} />
              <span>Cadastrar-se</span>
            </button>
          </div>
          */}
        </form>
      </div>
    </div>
  );
}