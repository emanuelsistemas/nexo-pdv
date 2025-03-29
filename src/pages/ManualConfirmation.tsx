import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';

export default function ManualConfirmation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');

  const handleConfirmUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      
      if (!userId) {
        toast.error('Por favor, forneça o ID do usuário.');
        return;
      }

      // Este método requer uma chave de serviço configurada e acesso de administrador
      // A implementação abaixo é apenas para testes locais e depuração
      const { error } = await supabase.auth.admin.updateUserById(
        userId,
        { email_confirm: true }
      );

      if (error) {
        if (error.message.includes('service_role key')) {
          toast.error('Esta funcionalidade requer uma chave de serviço (service_role) configurada.');
        } else {
          toast.error(`Erro ao confirmar usuário: ${error.message}`);
        }
        return;
      }

      toast.success('Usuário confirmado com sucesso!');
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (error: any) {
      console.error('Erro ao confirmar usuário:', error);
      toast.error('Erro ao confirmar usuário. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleFindUser = async () => {
    try {
      setLoading(true);
      
      if (!email) {
        toast.error('Por favor, forneça um email válido.');
        return;
      }

      // Aqui você precisaria ter acesso admin ao Supabase ou uma API personalizada
      // Este é apenas um exemplo e não funcionará sem as permissões adequadas
      toast.info(`Buscando usuário pelo email: ${email}...`);
      
      // Simulando uma resposta para fins de demonstração
      setTimeout(() => {
        toast.info('Para confirmar manualmente, acesse o painel admin do Supabase.');
      }, 1500);
      
    } catch (error: any) {
      console.error('Erro ao buscar usuário:', error);
      toast.error('Erro ao buscar usuário. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-md space-y-8 auth-form p-8 rounded-xl">
        <div className="text-center">
          <Logo />
          <h2 className="mt-4 text-xl font-bold text-slate-200">Confirmação Manual de Usuário</h2>
          <p className="text-slate-400 mt-2">
            Atenção: Esta página é apenas para administradores.
          </p>
        </div>

        <div className="p-4 bg-amber-900/30 border border-amber-700/50 rounded-lg">
          <p className="text-amber-200 text-sm">
            <strong>Nota:</strong> Esta funcionalidade requer uma chave de serviço (service_role) 
            do Supabase e permissões de administrador. Use apenas para fins de depuração.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleConfirmUser}>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Email do Usuário
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="usuario@email.com"
              />
              <button
                type="button"
                onClick={handleFindUser}
                disabled={loading || !email}
                className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                Buscar
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              ID do Usuário
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="uuid do usuário (obtido no painel admin)"
              required
            />
            <p className="mt-1 text-xs text-slate-400">
              Para obter o ID do usuário, vá ao painel do Supabase &gt; Authentication &gt; Users
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !userId}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-2.5 px-4 rounded-lg transition-all duration-200 font-medium shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <CheckCircle size={20} />
                <span>Confirmar Usuário</span>
              </>
            )}
          </button>
        </form>

        <div className="border-t border-slate-700 pt-6 mt-8">
          <div className="text-center">
            <p className="text-slate-400 mb-4 text-sm">
              Alternativamente, no painel do Supabase, você pode confirmar um usuário diretamente:
            </p>
            <ol className="text-left text-slate-400 text-sm space-y-2 list-decimal list-inside ml-2">
              <li>Acesse o painel do Supabase</li>
              <li>Vá para Authentication &gt; Users</li>
              <li>Encontre o usuário desejado</li>
              <li>Clique nos três pontos (...) e selecione "Confirm email"</li>
            </ol>
          </div>
        </div>

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
