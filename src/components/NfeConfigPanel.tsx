import React from 'react';
import { Save } from 'lucide-react';
import { toast } from 'react-toastify';
import { loadFiscalConfigs, saveFiscalConfigs, FiscalConfig } from '../utils/fiscalUtils';

interface NfeConfigProps {
  config: FiscalConfig;
  onChange: (config: any) => void;
  onSave: () => void;
}

export const NfeConfigPanel: React.FC<NfeConfigProps> = ({ config, onChange, onSave }) => {
  // Atualiza o estado quando um campo de NF-e for alterado
  const handleNfeChange = (key: string, value: any) => {
    onChange({
      ...config,
      nfe: {
        ...config.nfe,
        [key]: value
      }
    });
  };

  // Atualiza o estado quando um campo de NFC-e for alterado
  const handleNfceChange = (key: string, value: any) => {
    onChange({
      ...config,
      nfce: {
        ...config.nfce,
        [key]: value
      }
    });
  };

  return (
    <div className="p-6 space-y-6">
      <h3 className="text-xl font-bold text-white mb-4">Configurações NFE / NFC-e</h3>
      
      {/* Subabas para NF-e (Modelo 55) e NFC-e (Modelo 65) */}
      <div className="bg-slate-800 p-4 rounded-lg">
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-white mb-4">NF-e (Modelo 55)</h4>
          
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
        </div>
      
        <div className="border-t border-slate-700 pt-6 mb-4">
          <h4 className="text-lg font-semibold text-white mb-4">NFC-e (Modelo 65)</h4>
          
          {/* Status da NFC-e */}
          <div className="flex items-center justify-between bg-slate-700 p-4 rounded-md mb-4">
            <div>
              <h5 className="text-white font-medium">Status</h5>
              <p className="text-slate-400 text-sm">Ativar emissão de NFC-e (Modelo 65)</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={config.nfce.ativo}
                onChange={() => handleNfceChange('ativo', !config.nfce.ativo)}
              />
              <div className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-2 
                peer-focus:ring-blue-300 ${config.nfce.ativo ? 'bg-blue-500' : 'bg-gray-600'} 
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
                  checked={config.nfce.ambiente === 'homologacao'}
                  onChange={() => handleNfceChange('ambiente', 'homologacao')}
                />
                <span className="text-slate-300">Homologação</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="radio" 
                  className="form-radio text-blue-500" 
                  checked={config.nfce.ambiente === 'producao'}
                  onChange={() => handleNfceChange('ambiente', 'producao')}
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
              value={config.nfce.versao}
              onChange={(e) => handleNfceChange('versao', e.target.value)}
            />
          </div>
          
          {/* Série */}
          <div className="mb-4">
            <label className="block text-white font-medium mb-2">Série</label>
            <input
              type="text"
              className="w-24 px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={config.nfce.serie}
              onChange={(e) => handleNfceChange('serie', e.target.value)}
            />
          </div>
          
          {/* Número Atual */}
          <div className="mb-4">
            <label className="block text-white font-medium mb-2">Número Atual</label>
            <input
              type="text"
              className="w-40 px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={config.nfce.numeroAtual}
              onChange={(e) => handleNfceChange('numeroAtual', e.target.value)}
            />
          </div>
          
          {/* CSC ID (Token ID) */}
          <div className="mb-4">
            <label className="block text-white font-medium mb-2">CSC ID (Token ID)</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={config.nfce.cscId}
              onChange={(e) => handleNfceChange('cscId', e.target.value)}
              placeholder="ID do CSC fornecido pela SEFAZ"
            />
          </div>
          
          {/* CSC Token */}
          <div className="mb-4">
            <label className="block text-white font-medium mb-2">CSC Token</label>
            <input
              type="password"
              className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={config.nfce.cscToken}
              onChange={(e) => handleNfceChange('cscToken', e.target.value)}
              placeholder="Token CSC fornecido pela SEFAZ"
            />
          </div>
        </div>
      </div>
      
      {/* Informações sobre certificado digital */}
      <div className="bg-slate-800 p-4 rounded-lg">
        <h4 className="text-lg font-semibold text-white mb-4">Certificado Digital</h4>
        <p className="text-slate-400 mb-4">O certificado digital é necessário para emissão de NF-e e NFC-e. Certifique-se de ter um certificado A1 válido.</p>
        
        <div className="flex flex-col space-y-4">
          <div>
            <label className="block text-white font-medium mb-2">Arquivo do Certificado</label>
            <div className="flex">
              <input
                type="text"
                className="flex-1 px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nenhum arquivo selecionado"
                value={config.nfe.certificadoArquivo}
                onChange={(e) => {
                  handleNfeChange('certificadoArquivo', e.target.value);
                  handleNfceChange('certificadoArquivo', e.target.value);
                }}
                readOnly
              />
              <button
                type="button"
                className="px-4 py-2 bg-slate-600 text-white rounded-r-md hover:bg-slate-500 transition-colors"
              >
                Selecionar
              </button>
            </div>
            <p className="text-slate-500 text-xs mt-1">Apenas arquivos .pfx são suportados</p>
          </div>
          
          <div>
            <label className="block text-white font-medium mb-2">Senha do Certificado</label>
            <input
              type="password"
              className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Digite a senha do certificado"
              value={config.nfe.certificadoSenha}
              onChange={(e) => {
                handleNfeChange('certificadoSenha', e.target.value);
                handleNfceChange('certificadoSenha', e.target.value);
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Botão de salvar */}
      <div className="flex justify-end mt-6">
        <button
          onClick={onSave}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
        >
          <Save size={18} />
          Salvar Configurações
        </button>
      </div>
    </div>
  );
};

// Exportando as funções de carregamento e salvamento de configurações fiscais
export { loadFiscalConfigs, saveFiscalConfigs };
