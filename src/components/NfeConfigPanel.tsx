import React from 'react';
import { Save } from 'lucide-react';
import { FiscalConfig } from '../utils/fiscalUtils'; // Importar a interface completa

interface NfeConfigProps {
  config: FiscalConfig; // Receber a configuração completa
  onChange: (config: FiscalConfig) => void; // Função para atualizar a configuração completa
  onSave: () => void;
}

export const NfeConfigPanel: React.FC<NfeConfigProps> = ({ config, onChange, onSave }) => {
  // Atualiza o estado quando um campo de NF-e for alterado
  const handleNfeChange = (key: keyof FiscalConfig['nfe'], value: any) => {
    onChange({
      ...config,
      nfe: {
        ...config.nfe,
        [key]: value
      }
    });
  };

  return (
    <div className="p-6 space-y-6">
      <h3 className="text-xl font-bold text-white mb-4">Configurações NF-e (Modelo 55)</h3>
      
      <div className="bg-slate-800 p-4 rounded-lg">
        {/* Status da NF-e */}
        <div className="flex items-center justify-between bg-slate-700 p-4 rounded-md mb-4">
          <div>
            <h5 className="text-white font-medium">Status</h5>
            <p className="text-slate-400 text-sm">Ativar emissão de NF-e (Modelo 55)</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={config.nfe.ativo}
              onChange={() => handleNfeChange('ativo', !config.nfe.ativo)}
            />
            <div className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-2 
              peer-focus:ring-blue-300 ${config.nfe.ativo ? 'bg-blue-500' : 'bg-gray-600'} 
              after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
              after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 
              after:transition-all peer-checked:after:translate-x-full`}></div>
          </label>
        </div>
        
        {/* Ambiente */}
        <div className="mb-4">
          <label className="block text-white font-medium mb-2">Ambiente</label>
          <div className="flex gap-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="radio" 
                className="form-radio text-blue-500" 
                checked={config.nfe.ambiente === 'homologacao'}
                onChange={() => handleNfeChange('ambiente', 'homologacao')}
              />
              <span className="text-slate-300">Homologação</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="radio" 
                className="form-radio text-blue-500" 
                checked={config.nfe.ambiente === 'producao'}
                onChange={() => handleNfeChange('ambiente', 'producao')}
              />
              <span className="text-slate-300">Produção</span>
            </label>
          </div>
        </div>
        
        {/* Versão */}
        <div className="mb-4">
          <label className="block text-white font-medium mb-2">Versão</label>
          <input
            type="text"
            className="w-24 px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={config.nfe.versao}
            onChange={(e) => handleNfeChange('versao', e.target.value)}
          />
        </div>
        
        {/* Série */}
        <div className="mb-4">
          <label className="block text-white font-medium mb-2">Série</label>
          <input
            type="text"
            className="w-24 px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={config.nfe.serie}
            onChange={(e) => handleNfeChange('serie', e.target.value)}
          />
        </div>
        
        {/* Número Atual */}
        <div className="mb-4">
          <label className="block text-white font-medium mb-2">Número Atual</label>
          <input
            type="text"
            className="w-40 px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={config.nfe.numeroAtual}
            onChange={(e) => handleNfeChange('numeroAtual', e.target.value)}
          />
        </div>

        {/* Logo da Empresa */}
        <div className="mb-4">
          <label className="block text-white font-medium mb-2">Logo para DANFE</label>
          <div className="flex items-center space-x-4">
            {config.nfe.logoUrl && (
              <img src={config.nfe.logoUrl} alt="Logo" className="h-16 w-auto bg-white p-1 rounded" />
            )}
            <input
              type="text"
              className="flex-1 px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="URL da imagem do logo"
              value={config.nfe.logoUrl}
              onChange={(e) => handleNfeChange('logoUrl', e.target.value)}
            />
          </div>
          <p className="text-slate-500 text-xs mt-1">Insira a URL pública da imagem (ex: PNG, JPG).</p>
        </div>
      </div>
      
      {/* Nota informativa sobre certificado digital */}
      <div className="bg-slate-800 p-4 rounded-lg">
        <h4 className="text-lg font-semibold text-white mb-4">Certificado Digital</h4>
        <div className="bg-slate-700 p-3 rounded-md">
          <p className="text-slate-300 text-sm mb-0">O certificado digital para emissão de NF-e está configurado na aba <strong>Sistema</strong>.</p>
        </div>
      </div>
      
      {/* Botão de salvar */}
      <div className="flex justify-end mt-6">
        <button
          onClick={onSave}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
        >
          <Save size={18} />
          Salvar Configurações NF-e
        </button>
      </div>
    </div>
  );
};
