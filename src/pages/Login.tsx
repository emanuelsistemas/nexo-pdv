import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import { openKioskWindow } from '../utils/windowUtils';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirmationAlert, setShowConfirmationAlert] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  // Verifica se o usuário veio da página de registro
  useEffect(() => {
    if (location.state?.justRegistered) {
      setShowConfirmationAlert(true);
      if (location.state.email) {
        setRegisteredEmail(location.state.email);
        setFormData(prev => ({ ...prev, email: location.state.email }));
      }
      
      // Limpa o estado para que, ao atualizar a página, a faixa não apareça novamente
      window.history.replaceState({}, document.title);
    }
  }, [location]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (error) {
        // Tratamento específico para cada tipo de erro
        switch (error.message) {
          case 'Invalid login credentials':
            toast.error('E-mail ou senha incorretos');
            break;
          case 'Email not confirmed':
            toast.error(
              'É necessário confirmar seu e-mail antes de fazer login. Por favor verifique sua caixa de entrada e pasta de spam.',
              { autoClose: 6000 }
            );
            // Mostrar um toast adicional com o link para reenviar a confirmação
            setTimeout(() => {
              toast.info(
                <div onClick={() => navigate('/resend-confirmation')}>
                  Não recebeu o e-mail? Clique aqui para reenviar
                </div>,
                { 
                  autoClose: 10000,
                  onClick: () => navigate('/resend-confirmation')
                }
              );
            }, 1000);
            break;
          case 'Rate limit exceeded':
            toast.error('Muitas tentativas de login. Por favor, aguarde alguns minutos');
            break;
          default:
            console.error('Erro de login:', error);
            toast.error('Erro ao fazer login. Por favor, tente novamente');
        }
        return;
      }

      toast.success('Login realizado com sucesso!');
      
      // Abre o dashboard em uma janela em modo quiosque
      try {
        const dashboardWindow = openKioskWindow(window.location.origin + '/dashboard');
        
        // Verifica se a janela foi aberta com sucesso
        if (!dashboardWindow) {
          console.warn('Não foi possível abrir a janela do Dashboard em modo quiosque.');
          toast.warn('O bloqueador de pop-ups pode estar ativo. Por favor, permita pop-ups para este site.');
          // Fallback para navegação direta caso não seja possível abrir a janela
          navigate('/dashboard');
          return;
        }
      } catch (error) {
        console.error('Erro ao abrir janela em modo quiosque:', error);
        // Fallback para navegação direta caso ocorra algum erro
        navigate('/dashboard');
        return;
      }
      
      // Redireciona a janela atual para a página inicial
      navigate('/', { replace: true });
    } catch (error: any) {
      console.error('Erro completo:', error);
      toast.error('Erro ao conectar com o servidor. Por favor, tente novamente');
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-slate-800">
      {showConfirmationAlert && (
        <div className="w-full max-w-md mb-4">
          <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 rounded-lg shadow-md">
            <div className="flex items-start">
              <div className="flex-1">
                <p className="font-bold">Confirmação de Email Necessária</p>
                <p className="text-sm">
                  Enviamos um email de confirmação para você. Por favor, verifique sua caixa de entrada e pasta de spam.
                </p>
                <div className="mt-2">
                  <Link
                    to="/resend-confirmation"
                    className="text-amber-800 hover:text-amber-900 underline text-sm font-medium"
                  >
                    Não recebeu o email? Clique aqui para reenviar
                  </Link>
                </div>
              </div>
              <button 
                onClick={() => setShowConfirmationAlert(false)}
                className="text-amber-700 hover:text-amber-900 ml-2"
              >
                &times;
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="w-full max-w-md space-y-8 auth-form p-8 rounded-xl">
        <div className="text-center">
          <Logo />
          <p className="text-slate-400 mt-3">Faça login para continuar</p>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="seu@email.com"
              required
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-300">
                Senha
              </label>
              <Link 
                to="/password-recovery"
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="••••••••"
                required
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

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-2.5 px-4 rounded-lg transition-all duration-200 font-medium shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
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

        <p className="text-center text-sm text-slate-400">
          Não tem uma conta?{' '}
          <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
