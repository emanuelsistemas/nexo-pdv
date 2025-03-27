import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';

export default function PasswordRecovery() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);

      // Configura a URL de redirecionamento absoluta
      const redirectTo = new URL('/reset-password', window.location.origin).toString();

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo
      });

      if (error) {
        if (error.message.includes('Email not found')) {
          toast.error('Este e-mail não está cadastrado. Por favor, crie uma conta.');
          return;
        }
        throw error;
      }

      toast.success(
        'E-mail de recuperação enviado! Por favor, verifique sua caixa de entrada.',
        { autoClose: 6000 }
      );
      setEmail('');
    } catch (error: any) {
      console.error('Erro completo:', error);
      toast.error('Erro ao enviar e-mail de recuperação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-md space-y-8 auth-form p-8 rounded-xl">
        <div className="text-center">
          <Logo />
          <p className="text-slate-400 mt-3">Recuperação de senha</p>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="seu@email.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-2.5 px-4 rounded-lg transition-all duration-200 font-medium shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Send size={20} />
                <span>Enviar link de recuperação</span>
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-center">
          <Link
            to="/login"
            className="flex items-center gap-2 text-slate-400 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft size={20} />
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}