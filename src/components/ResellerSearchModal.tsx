import React, { useState } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../lib/supabase';

interface ResellerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (resellerId: string, resellerName: string, resellerCode: string) => void;
  currentCode?: string;
}

const ResellerSearchModal: React.FC<ResellerSearchModalProps> = ({ 
  isOpen, 
  onClose, 
  onSelect,
  currentCode = ''
}) => {
  const [code, setCode] = useState(currentCode);
  const [searching, setSearching] = useState(false);
  const [resellerName, setResellerName] = useState('');
  const [resellerId, setResellerId] = useState('');
  const [found, setFound] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!code || code.length !== 5) {
      toast.error('Digite um código válido de 5 dígitos');
      return;
    }
    
    try {
      setSearching(true);
      
      const { data, error } = await supabase
        .from('resellers')
        .select('id, trade_name, code')
        .eq('code', code)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setResellerName(data.trade_name);
        setResellerId(data.id);
        setFound(true);
        toast.success('Revendedor encontrado!');
      } else {
        toast.error('Código de revendedor não encontrado');
        setFound(false);
        setResellerName('');
        setResellerId('');
      }
    } catch (error: any) {
      console.error('Erro ao buscar revendedor:', error);
      toast.error('Erro ao buscar revendedor');
      setFound(false);
      setResellerName('');
      setResellerId('');
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = () => {
    if (found && resellerId) {
      onSelect(resellerId, resellerName, code);
    }
    onClose();
  };

  const handleNoReseller = () => {
    onSelect('', '', '');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-slate-800 p-6 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-medium text-white">Buscar Revendedor</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Código da Revenda
          </label>
          <div className="flex">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-2 rounded-l-lg bg-slate-900 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Digite o código (5 dígitos)"
              maxLength={5}
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching || !code || code.length !== 5}
              className="px-4 py-2 rounded-r-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            </button>
          </div>
        </div>
        
        {found && (
          <div className="mb-4 p-3 bg-slate-700 rounded-lg">
            <div className="text-sm text-gray-400">Revendedor:</div>
            <div className="text-white font-medium">{resellerName}</div>
            <div className="text-sm text-gray-400 mt-1">Código: <span className="text-white font-mono">{code}</span></div>
          </div>
        )}
        
        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={handleNoReseller}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white"
          >
            Sem revendedor
          </button>
          
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-lg ${
              found 
                ? 'bg-blue-600 hover:bg-blue-500' 
                : 'bg-slate-600'
            } text-white ${!found && 'opacity-50 cursor-not-allowed'}`}
            disabled={!found && code.length === 5}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResellerSearchModal;
