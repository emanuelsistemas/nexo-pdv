import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';

interface GroupSlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  groupToEdit?: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

interface GroupFormData {
  name: string;
  description: string;
}

export function GroupSlidePanel({ isOpen, onClose, groupToEdit }: GroupSlidePanelProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (groupToEdit) {
      setFormData({
        name: groupToEdit.name,
        description: groupToEdit.description || ''
      });
    } else {
      setFormData({
        name: '',
        description: ''
      });
    }
  }, [groupToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Usuário não autenticado');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.company_id) {
        throw new Error('Empresa não encontrada');
      }

      if (groupToEdit) {
        // Atualizar grupo existente
        const { error: updateError } = await supabase
          .from('product_groups')
          .update({
            name: formData.name,
            description: formData.description
          })
          .eq('id', groupToEdit.id)
          .eq('company_id', profile.company_id);

        if (updateError) {
          if (updateError.code === '23505') {
            throw new Error('Já existe um grupo com este nome');
          }
          throw updateError;
        }

        toast.success('Grupo atualizado com sucesso!');
      } else {
        // Criar novo grupo
        const { error: insertError } = await supabase
          .from('product_groups')
          .insert({
            company_id: profile.company_id,
            name: formData.name,
            description: formData.description
          });

        if (insertError) {
          if (insertError.code === '23505') {
            throw new Error('Já existe um grupo com este nome');
          }
          throw insertError;
        }

        toast.success('Grupo cadastrado com sucesso!');
      }

      setFormData({ name: '', description: '' });
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar grupo:', error);
      toast.error(error.message || 'Erro ao processar grupo');
    } finally {
      setLoading(false);
    }
  };

  const panelClasses = `fixed right-0 top-0 h-full w-full md:w-[600px] bg-slate-800 shadow-xl transform transition-transform duration-300 ease-in-out ${
    isOpen ? 'translate-x-0' : 'translate-x-full'
  }`;

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-40"
          onClick={onClose}
        />
      )}

      <div className={`${panelClasses} z-50`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-200">
              {groupToEdit ? 'Editar Grupo' : 'Novo Grupo'}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Descrição
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </form>
          </div>

          <div className="p-6 border-t border-slate-700">
            <button
              type="submit"
              disabled={loading}
              onClick={handleSubmit}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-2.5 px-4 rounded-lg transition-all duration-200 font-medium shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Salvar</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}