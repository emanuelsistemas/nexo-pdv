import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';

export default function ResendConfirmation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) {
        throw error;
      }

      toast.success(
        'E-mail de confirmação reenviado com sucesso! Por favor verifique sua caixa de entrada e pasta de spam.',
        { autoClose: 8000 }
      );
      
      // Redirecionamento após um pequeno tempo para dar tempo ao usuário de ler a mensagem de sucesso
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (error: any) {
      console.error('Erro ao reenviar e-mail:', error);
      toast.error(
        error.message === 'Rate limit exceeded'
          ? 'Aguarde alguns minutos antes de tentar novamente.'
          : 'Erro ao reenviar e-mail. Por favor tente novamente mais tarde.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-md space-y-8 auth-form p-8 rounded-xl">
        <div className="text-center">
          <Logo />
          <h2 className="mt-4 text-xl font-bold text-slate-200">Reenviar e-mail de confirmação</h2>
          <p className="text-slate-400 mt-2">
            Informe seu e-mail para receber um novo link de confirmação
          </p>
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
                <span>Reenviando...</span>
              </>
            ) : (
              <>
                <Send size={20} />
                <span>Reenviar e-mail</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-4">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Voltar para login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
