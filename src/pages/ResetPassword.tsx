import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Save, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    // Verifica se há um token de recuperação válido
    const checkRecoveryToken = async () => {
      try {
        const recoveryToken = localStorage.getItem('recovery_token');
        
        // Verifica se estamos na URL de reset de senha diretamente (não via redirecionamento)
        const isDirectReset = window.location.pathname === '/reset-password' && !recoveryToken;
        
        // Se não houver token e não for acesso direto, redireciona
        if (!recoveryToken && !isDirectReset) {
          // Verifica se há um hash de recuperação na URL
          const hash = window.location.hash;
          const isRecoveryFlow = hash && hash.includes('type=recovery');
          
          // Se não for um fluxo de recuperação e não houver token, redireciona
          if (!isRecoveryFlow) {
            toast.error('Link de recuperação inválido ou expirado');
            navigate('/login');
            return;
          }
          
          // Se estamos no fluxo de recuperação, não redireciona ainda,
          // aguarda o processo de autenticação
          return;
        }

        if (recoveryToken) {
          // Verifica se o token é válido apenas se ele existir
          const { data: { user }, error } = await supabase.auth.getUser();
          
          if (error || !user) {
            toast.error('Link de recuperação inválido ou expirado');
            navigate('/login');
            localStorage.removeItem('recovery_token');
          }
        }
      } catch (error) {
        console.error('Erro ao verificar token:', error);
        toast.error('Erro ao verificar token de recuperação');
        navigate('/login');
      }
    };

    checkRecoveryToken();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não correspondem');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      setLoading(true);

      const recoveryToken = localStorage.getItem('recovery_token');
      if (!recoveryToken) {
        throw new Error('Token de recuperação não encontrado');
      }

      const { error } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (error) throw error;

      // Limpa o token após a atualização bem-sucedida
      localStorage.removeItem('recovery_token');
      
      toast.success('Senha atualizada com sucesso!');
      navigate('/login');
    } catch (error: any) {
      console.error('Erro completo:', error);
      toast.error('Erro ao atualizar senha. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-md space-y-8 auth-form p-8 rounded-xl">
        <div className="text-center">
          <Logo />
          <p className="text-slate-400 mt-3">Defina sua nova senha</p>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Nova Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Confirmar Nova Senha
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-2.5 px-4 rounded-lg transition-all duration-200 font-medium shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save size={20} />
                <span>Salvar nova senha</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}