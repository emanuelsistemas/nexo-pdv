import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';
import { toast } from 'react-toastify';
import { User, Lock, Zap } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
      
      if (data?.user) {
        toast.success('Login realizado com sucesso!');
        navigate('/admin/whats-test'); // Redireciona para a página de conexões WhatsApp
      }
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);
      setError(error.message || 'Falha ao realizar o login');
      toast.error('Falha ao realizar o login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#2A2A2A] rounded-lg shadow-xl border border-gray-800 overflow-hidden">
        <div className="p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">Login</h1>
            <p className="text-gray-400">Faça login para gerenciar suas conexões WhatsApp</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={18} className="text-gray-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-1 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-[#1C1C1C] border border-gray-800 rounded-lg text-white focus:ring-1 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Sua senha"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <span>Entrando...</span>
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-400">
              Use as credenciais de acesso ao sistema Nexo PDV
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
