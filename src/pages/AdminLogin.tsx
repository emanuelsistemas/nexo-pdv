import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Loader2, Database } from 'lucide-react';
import { toast } from 'react-toastify';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Verify environment variables on component mount
  useEffect(() => {
    if (!import.meta.env.VITE_ADMIN_EMAIL || !import.meta.env.VITE_ADMIN_PASSWORD) {
      console.error('Admin credentials not properly configured in environment variables');
      toast.error('Erro de configuração do sistema');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);

      // Check if environment variables are available
      if (!import.meta.env.VITE_ADMIN_EMAIL || !import.meta.env.VITE_ADMIN_PASSWORD) {
        throw new Error('Erro de configuração do sistema');
      }

      // Validate credentials
      const isValidEmail = formData.email === import.meta.env.VITE_ADMIN_EMAIL;
      const isValidPassword = formData.password === import.meta.env.VITE_ADMIN_PASSWORD;

      if (!isValidEmail || !isValidPassword) {
        throw new Error('Credenciais inválidas');
      }

      // Save admin session
      localStorage.setItem('admin_session', JSON.stringify({
        isAdmin: true,
        email: formData.email,
        timestamp: Date.now()
      }));

      toast.success('Login realizado com sucesso!');
      navigate('/admin/dashboard');
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);
      toast.error(error.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#1C1C1C]">
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
        </form>
      </div>
    </div>
  );
}