import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';

interface Transporte {
  id: string;
  modalidade_frete: string;
  transportadora_documento: string;
  transportadora_nome: string;
  transportadora_ie: string;
  transportadora_endereco: string;
  transportadora_municipio: string;
  transportadora_uf: string;
  veiculo_placa: string;
  veiculo_uf: string;
  veiculo_rntc: string;
}

interface Volume {
  id?: string;
  quantidade: number;
  especie: string;
  marca: string;
  numeracao: string;
  peso_liquido: number;
  peso_bruto: number;
}

interface NFETransporteTabProps {
  transporte: Transporte;
  volumes: Volume[];
  onTransporteChange: (transporte: Partial<Transporte>) => void;
  onVolumesChange: (volumes: Volume[]) => void;
}

const NFETransporteTab: React.FC<NFETransporteTabProps> = ({ 
  transporte, 
  volumes, 
  onTransporteChange, 
  onVolumesChange 
}) => {
  const [showVolumeForm, setShowVolumeForm] = useState(false);
  const [volumeForm, setVolumeForm] = useState<Volume>({
    quantidade: 1,
    especie: '',
    marca: '',
    numeracao: '',
    peso_liquido: 0,
    peso_bruto: 0
  });

  const handleTransporteChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onTransporteChange({ [name]: value });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedValue = name === 'quantidade' || name === 'peso_liquido' || name === 'peso_bruto' 
      ? parseFloat(value) || 0 
      : value;
    
    setVolumeForm(prev => ({
      ...prev,
      [name]: updatedValue
    }));
  };

  const handleAddVolume = () => {
    // Validação básica
    if (!volumeForm.especie) {
      toast.error('Informe pelo menos a espécie do volume');
      return;
    }

    // Verificar se peso bruto é maior ou igual ao peso líquido
    if (volumeForm.peso_bruto < volumeForm.peso_liquido) {
      toast.error('O peso bruto deve ser maior ou igual ao peso líquido');
      return;
    }

    // Adicionar novo volume
    const newVolume = {
      ...volumeForm,
      id: `temp_${Date.now()}` // ID temporário
    };

    onVolumesChange([...volumes, newVolume]);
    
    // Resetar formulário
    setVolumeForm({
      quantidade: 1,
      especie: '',
      marca: '',
      numeracao: '',
      peso_liquido: 0,
      peso_bruto: 0
    });
    
    setShowVolumeForm(false);
    toast.success('Volume adicionado!');
  };

  const handleRemoveVolume = (volumeId: string | undefined) => {
    if (!volumeId) return;
    
    const updatedVolumes = volumes.filter(v => v.id !== volumeId);
    onVolumesChange(updatedVolumes);
    toast.success('Volume removido!');
  };

  const formatCPFCNPJ = (value: string) => {
    // Remove caracteres não numéricos
    const numericValue = value.replace(/\D/g, '');
    
    // Formatar como CNPJ (transportadora geralmente é PJ)
    if (numericValue.length <= 2) {
      return numericValue;
    } else if (numericValue.length <= 5) {
      return `${numericValue.slice(0, 2)}.${numericValue.slice(2)}`;
    } else if (numericValue.length <= 8) {
      return `${numericValue.slice(0, 2)}.${numericValue.slice(2, 5)}.${numericValue.slice(5)}`;
    } else if (numericValue.length <= 12) {
      return `${numericValue.slice(0, 2)}.${numericValue.slice(2, 5)}.${numericValue.slice(5, 8)}/${numericValue.slice(8)}`;
    } else {
      return `${numericValue.slice(0, 2)}.${numericValue.slice(2, 5)}.${numericValue.slice(5, 8)}/${numericValue.slice(8, 12)}-${numericValue.slice(12, 14)}`;
    }
  };

  const handleDocumentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const formattedValue = formatCPFCNPJ(value);
    onTransporteChange({ transportadora_documento: formattedValue });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-slate-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Dados do Transporte</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Modalidade de Frete */}
          <div>
            <label className="block text-white font-medium mb-1">Modalidade de Frete</label>
            <select
              name="modalidade_frete"
              value={transporte.modalidade_frete}
              onChange={handleTransporteChange}
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="0">0 - Contratação por conta do Remetente (CIF)</option>
              <option value="1">1 - Contratação por conta do Destinatário (FOB)</option>
              <option value="2">2 - Contratação por conta de Terceiros</option>
              <option value="3">3 - Transporte Próprio por conta do Remetente</option>
              <option value="4">4 - Transporte Próprio por conta do Destinatário</option>
              <option value="9">9 - Sem Ocorrência de Transporte</option>
            </select>
          </div>

          {/* Espaçador */}
          <div></div>
        </div>

        {/* Transportadora */}
        <div className="mb-4">
          <h4 className="text-md font-semibold text-white mb-2">Dados da Transportadora</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-750 rounded-md border border-slate-600">
            {/* CNPJ/CPF */}
            <div>
              <label className="block text-white text-sm font-medium mb-1">CNPJ/CPF</label>
              <input
                type="text"
                name="transportadora_documento"
                value={transporte.transportadora_documento}
                onChange={handleDocumentoChange}
                className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="00.000.000/0000-00"
              />
            </div>

            {/* Nome */}
            <div className="md:col-span-2">
              <label className="block text-white text-sm font-medium mb-1">Nome/Razão Social</label>
              <input
                type="text"
                name="transportadora_nome"
                value={transporte.transportadora_nome}
                onChange={handleTransporteChange}
                className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome da transportadora"
              />
            </div>

            {/* IE */}
            <div>
              <label className="block text-white text-sm font-medium mb-1">Inscrição Estadual</label>
              <input
                type="text"
                name="transportadora_ie"
                value={transporte.transportadora_ie}
                onChange={handleTransporteChange}
                className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Inscrição Estadual"
              />
            </div>

            {/* Endereço */}
            <div className="md:col-span-2">
              <label className="block text-white text-sm font-medium mb-1">Endereço Completo</label>
              <input
                type="text"
                name="transportadora_endereco"
                value={transporte.transportadora_endereco}
                onChange={handleTransporteChange}
                className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Logradouro, número, complemento, bairro"
              />
            </div>

            {/* Município */}
            <div>
              <label className="block text-white text-sm font-medium mb-1">Município</label>
              <input
                type="text"
                name="transportadora_municipio"
                value={transporte.transportadora_municipio}
                onChange={handleTransporteChange}
                className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Município"
              />
            </div>

            {/* UF */}
            <div>
              <label className="block text-white text-sm font-medium mb-1">UF</label>
              <select
                name="transportadora_uf"
                value={transporte.transportadora_uf}
                onChange={handleTransporteChange}
                className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione</option>
                <option value="AC">AC</option>
                <option value="AL">AL</option>
                <option value="AP">AP</option>
                <option value="AM">AM</option>
                <option value="BA">BA</option>
                <option value="CE">CE</option>
                <option value="DF">DF</option>
                <option value="ES">ES</option>
                <option value="GO">GO</option>
                <option value="MA">MA</option>
                <option value="MT">MT</option>
                <option value="MS">MS</option>
                <option value="MG">MG</option>
                <option value="PA">PA</option>
                <option value="PB">PB</option>
                <option value="PR">PR</option>
                <option value="PE">PE</option>
                <option value="PI">PI</option>
                <option value="RJ">RJ</option>
                <option value="RN">RN</option>
                <option value="RS">RS</option>
                <option value="RO">RO</option>
                <option value="RR">RR</option>
                <option value="SC">SC</option>
                <option value="SP">SP</option>
                <option value="SE">SE</option>
                <option value="TO">TO</option>
              </select>
            </div>
          </div>
        </div>

        {/* Veículo */}
        <div className="mb-6">
          <h4 className="text-md font-semibold text-white mb-2">Dados do Veículo</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-750 rounded-md border border-slate-600">
            {/* Placa */}
            <div>
              <label className="block text-white text-sm font-medium mb-1">Placa</label>
              <input
                type="text"
                name="veiculo_placa"
                value={transporte.veiculo_placa}
                onChange={handleTransporteChange}
                className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ABC1234"
              />
            </div>

            {/* UF */}
            <div>
              <label className="block text-white text-sm font-medium mb-1">UF</label>
              <select
                name="veiculo_uf"
                value={transporte.veiculo_uf}
                onChange={handleTransporteChange}
                className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione</option>
                <option value="AC">AC</option>
                <option value="AL">AL</option>
                <option value="AP">AP</option>
                <option value="AM">AM</option>
                <option value="BA">BA</option>
                <option value="CE">CE</option>
                <option value="DF">DF</option>
                <option value="ES">ES</option>
                <option value="GO">GO</option>
                <option value="MA">MA</option>
                <option value="MT">MT</option>
                <option value="MS">MS</option>
                <option value="MG">MG</option>
                <option value="PA">PA</option>
                <option value="PB">PB</option>
                <option value="PR">PR</option>
                <option value="PE">PE</option>
                <option value="PI">PI</option>
                <option value="RJ">RJ</option>
                <option value="RN">RN</option>
                <option value="RS">RS</option>
                <option value="RO">RO</option>
                <option value="RR">RR</option>
                <option value="SC">SC</option>
                <option value="SP">SP</option>
                <option value="SE">SE</option>
                <option value="TO">TO</option>
              </select>
            </div>

            {/* RNTC */}
            <div>
              <label className="block text-white text-sm font-medium mb-1">RNTC</label>
              <input
                type="text"
                name="veiculo_rntc"
                value={transporte.veiculo_rntc}
                onChange={handleTransporteChange}
                className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Registro ANTT"
              />
            </div>
          </div>
        </div>

        {/* Volumes */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-md font-semibold text-white">Volumes</h4>
            <button
              onClick={() => setShowVolumeForm(!showVolumeForm)}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md transition-colors text-sm"
            >
              <Plus size={16} />
              <span>{showVolumeForm ? 'Cancelar' : 'Adicionar Volume'}</span>
            </button>
          </div>

          {/* Formulário de Volume */}
          {showVolumeForm && (
            <div className="p-4 bg-slate-750 rounded-md border border-slate-600 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Quantidade */}
                <div>
                  <label className="block text-white text-sm font-medium mb-1">Quantidade</label>
                  <input
                    type="number"
                    name="quantidade"
                    min="1"
                    step="1"
                    value={volumeForm.quantidade}
                    onChange={handleVolumeChange}
                    className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Espécie */}
                <div>
                  <label className="block text-white text-sm font-medium mb-1">Espécie *</label>
                  <input
                    type="text"
                    name="especie"
                    value={volumeForm.especie}
                    onChange={handleVolumeChange}
                    className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Caixa, Fardo, etc."
                  />
                </div>

                {/* Marca */}
                <div>
                  <label className="block text-white text-sm font-medium mb-1">Marca</label>
                  <input
                    type="text"
                    name="marca"
                    value={volumeForm.marca}
                    onChange={handleVolumeChange}
                    className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Marca"
                  />
                </div>

                {/* Numeração */}
                <div>
                  <label className="block text-white text-sm font-medium mb-1">Numeração</label>
                  <input
                    type="text"
                    name="numeracao"
                    value={volumeForm.numeracao}
                    onChange={handleVolumeChange}
                    className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Numeração"
                  />
                </div>

                {/* Peso Líquido */}
                <div>
                  <label className="block text-white text-sm font-medium mb-1">Peso Líquido (kg)</label>
                  <input
                    type="number"
                    name="peso_liquido"
                    min="0"
                    step="0.001"
                    value={volumeForm.peso_liquido}
                    onChange={handleVolumeChange}
                    className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0,000"
                  />
                </div>

                {/* Peso Bruto */}
                <div>
                  <label className="block text-white text-sm font-medium mb-1">Peso Bruto (kg)</label>
                  <input
                    type="number"
                    name="peso_bruto"
                    min="0"
                    step="0.001"
                    value={volumeForm.peso_bruto}
                    onChange={handleVolumeChange}
                    className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0,000"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={handleAddVolume}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  <Plus size={16} />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>
          )}

          {/* Lista de volumes */}
          {volumes.length > 0 ? (
            <div className="bg-slate-600 rounded-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-300">Qtd.</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-300">Espécie</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-300">Marca</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-300">Numeração</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-slate-300">Peso Líq.</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-slate-300">Peso Bruto</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-slate-300">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {volumes.map((volume) => (
                    <tr key={volume.id} className="hover:bg-slate-650">
                      <td className="px-4 py-3 text-sm text-slate-300">{volume.quantidade}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{volume.especie}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{volume.marca || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{volume.numeracao || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-300 text-right">
                        {volume.peso_liquido.toLocaleString('pt-BR', { minimumFractionDigits: 3 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300 text-right">
                        {volume.peso_bruto.toLocaleString('pt-BR', { minimumFractionDigits: 3 })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRemoveVolume(volume.id)}
                          className="text-red-400 hover:text-red-300 p-1"
                          title="Remover volume"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-slate-600 rounded-md p-4 text-center">
              <p className="text-slate-300">Nenhum volume adicionado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NFETransporteTab;
