import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';

interface UnitSlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  unitToEdit?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
  } | null;
}

interface UnitFormData {
  code: string;
  name: string;
  description: string;
}

const UNIT_OPTIONS = [
  { code: 'LT', name: 'Litro' },
  { code: 'PC', name: 'Peça' }
];

export function UnitSlidePanel({ isOpen, onClose, unitToEdit }: UnitSlidePanelProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UnitFormData>({
    code: '',
    name: '',
    description: ''
  });

  useEffect(() => {
    if (unitToEdit) {
      setFormData({
        code: unitToEdit.code,
        name: unitToEdit.name,
        description: unitToEdit.description || ''
      });
    } else {
      setFormData({
        code: '',
        name: '',
        description: ''
      });
    }
  }, [unitToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'code' && !unitToEdit) {
      const selectedUnit = UNIT_OPTIONS.find(unit => unit.code === value);
      if (selectedUnit) {
        setFormData(prev => ({
          ...prev,
          code: selectedUnit.code,
          name: selectedUnit.name
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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

      if (unitToEdit) {
        // Atualizar unidade existente
        const { error: updateError } = await supabase
          .from('product_units')
          .update({
            name: formData.name,
            description: formData.description
          })
          .eq('id', unitToEdit.id)
          .eq('company_id', profile.company_id);

        if (updateError) {
          throw updateError;
        }

        toast.success('Unidade atualizada com sucesso!');
      } else {
        // Criar nova unidade
        const { error: insertError } = await supabase
          .from('product_units')
          .insert({
            company_id: profile.company_id,
            code: formData.code,
            name: formData.name,
            description: formData.description
          });

        if (insertError) {
          if (insertError.code === '23505') {
            throw new Error('Já existe uma unidade com este código');
          }
          throw insertError;
        }

        toast.success('Unidade cadastrada com sucesso!');
      }

      setFormData({ code: '', name: '', description: '' });
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar unidade:', error);
      toast.error(error.message || 'Erro ao processar unidade');
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
              {unitToEdit ? 'Editar Unidade' : 'Nova Unidade'}
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
                  Código *
                </label>
                {unitToEdit ? (
                  <input
                    type="text"
                    value={formData.code}
                    className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-slate-400"
                    disabled
                  />
                ) : (
                  <select
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Selecione uma unidade</option>
                    {UNIT_OPTIONS.map(unit => (
                      <option key={unit.code} value={unit.code}>
                        {unit.code} - {unit.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

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
                  readOnly={!unitToEdit && formData.code !== ''}
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