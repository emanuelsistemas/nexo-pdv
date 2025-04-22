import React, { useState } from 'react';
import { Search, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../../lib/supabase';

interface Destinatario {
  id: string;
  tipo_documento: string;
  documento: string;
  nome: string;
  ie: string;
  email: string;
  telefone: string;
  endereco_logradouro: string;
  endereco_numero: string;
  endereco_complemento: string;
  endereco_bairro: string;
  endereco_cep: string;
  endereco_municipio: string;
  endereco_municipio_codigo: string;
  endereco_uf: string;
  endereco_pais: string;
  endereco_pais_codigo: string;
}

interface NFEDestinatarioTabProps {
  destinatario: Destinatario;
  onChange: (destinatario: Partial<Destinatario>) => void;
}

const NFEDestinatarioTab: React.FC<NFEDestinatarioTabProps> = ({ destinatario, onChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.warning('Digite um CPF, CNPJ ou nome para buscar');
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    try {
      // Buscar cliente pelo documento ou nome
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .or(`documento.ilike.%${searchTerm}%,nome.ilike.%${searchTerm}%`)
        .limit(5);

      if (error) throw error;

      setSearchResults(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast.error('Erro ao buscar clientes');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectClient = (client: any) => {
    // Preencher formulário com dados do cliente
    onChange({
      tipo_documento: client.documento?.length === 11 ? '1' : '2', // 1=CPF, 2=CNPJ
      documento: client.documento || '',
      nome: client.nome || '',
      ie: client.ie || '',
      email: client.email || '',
      telefone: client.telefone || '',
      endereco_logradouro: client.endereco_logradouro || '',
      endereco_numero: client.endereco_numero || '',
      endereco_complemento: client.endereco_complemento || '',
      endereco_bairro: client.endereco_bairro || '',
      endereco_cep: client.endereco_cep || '',
      endereco_municipio: client.endereco_municipio || '',
      endereco_municipio_codigo: client.endereco_municipio_codigo || '',
      endereco_uf: client.endereco_uf || ''
    });

    setShowResults(false);
    toast.success('Cliente selecionado com sucesso!');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange({ [name]: value });
  };

  const formatCEP = (cep: string) => {
    // Remove caracteres não numéricos
    const numericValue = cep.replace(/\D/g, '');
    
    // Formata como CEP (00000-000)
    if (numericValue.length <= 5) {
      return numericValue;
    } else {
      return `${numericValue.slice(0, 5)}-${numericValue.slice(5, 8)}`;
    }
  };

  const handleCEPBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    
    if (cep.length === 8) {
      try {
        // Buscar endereço pelo CEP usando API externa
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          onChange({
            endereco_logradouro: data.logradouro || destinatario.endereco_logradouro,
            endereco_bairro: data.bairro || destinatario.endereco_bairro,
            endereco_municipio: data.localidade || destinatario.endereco_municipio,
            endereco_uf: data.uf || destinatario.endereco_uf
          });
          
          // Buscar código do município no banco de dados
          const { data: municipioData } = await supabase
            .from('municipios')
            .select('codigo_ibge')
            .eq('nome', data.localidade)
            .eq('uf', data.uf)
            .limit(1);
            
          if (municipioData && municipioData.length > 0) {
            onChange({
              endereco_municipio_codigo: municipioData[0].codigo_ibge
            });
          }
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };

  const formatCPFCNPJ = (value: string, tipo: string) => {
    // Remove caracteres não numéricos
    const numericValue = value.replace(/\D/g, '');
    
    if (tipo === '1') { // CPF
      if (numericValue.length <= 3) {
        return numericValue;
      } else if (numericValue.length <= 6) {
        return `${numericValue.slice(0, 3)}.${numericValue.slice(3)}`;
      } else if (numericValue.length <= 9) {
        return `${numericValue.slice(0, 3)}.${numericValue.slice(3, 6)}.${numericValue.slice(6)}`;
      } else {
        return `${numericValue.slice(0, 3)}.${numericValue.slice(3, 6)}.${numericValue.slice(6, 9)}-${numericValue.slice(9, 11)}`;
      }
    } else { // CNPJ
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
    }
  };

  const handleCPFCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const formattedValue = formatCPFCNPJ(value, destinatario.tipo_documento);
    onChange({ documento: formattedValue });
  };

  const handleTipoDocumentoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    onChange({
      tipo_documento: value,
      documento: '' // Limpa o documento quando o tipo é alterado
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-slate-700 p-4 rounded-lg">
        {/* Busca de Cliente */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Buscar Cliente</h3>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Digite CPF, CNPJ ou nome para buscar um cliente cadastrado"
                className="w-full pl-10 pr-4 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-70"
            >
              {isSearching ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          {/* Resultados da busca */}
          {showResults && (
            <div className="mt-4">
              {isSearching ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="bg-slate-600 rounded-md p-4 text-center">
                  <p className="text-slate-300">Nenhum cliente encontrado</p>
                </div>
              ) : (
                <div className="bg-slate-600 rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-300">CPF/CNPJ</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-300">Nome</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-slate-300">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {searchResults.map((client) => (
                        <tr key={client.id} className="hover:bg-slate-650">
                          <td className="px-4 py-3 text-sm text-slate-300">{client.documento || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-slate-300">{client.nome}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleSelectClient(client)}
                              className="text-blue-400 hover:text-blue-300 p-1"
                              title="Selecionar cliente"
                            >
                              <CheckCircle2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Formulário de Destinatário */}
        <h3 className="text-lg font-semibold text-white mb-4">Dados do Destinatário</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tipo de documento */}
          <div>
            <label className="block text-white font-medium mb-1">Tipo de Documento</label>
            <select
              name="tipo_documento"
              value={destinatario.tipo_documento}
              onChange={handleTipoDocumentoChange}
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1">CPF</option>
              <option value="2">CNPJ</option>
            </select>
          </div>

          {/* CPF/CNPJ */}
          <div>
            <label className="block text-white font-medium mb-1">
              {destinatario.tipo_documento === '1' ? 'CPF' : 'CNPJ'}
            </label>
            <input
              type="text"
              name="documento"
              value={destinatario.documento}
              onChange={handleCPFCNPJChange}
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={destinatario.tipo_documento === '1' ? '000.000.000-00' : '00.000.000/0000-00'}
              maxLength={destinatario.tipo_documento === '1' ? 14 : 18}
            />
          </div>

          {/* Nome */}
          <div className="md:col-span-2">
            <label className="block text-white font-medium mb-1">Nome Completo / Razão Social</label>
            <input
              type="text"
              name="nome"
              value={destinatario.nome}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nome completo ou razão social"
            />
          </div>

          {/* IE */}
          <div>
            <label className="block text-white font-medium mb-1">Inscrição Estadual</label>
            <input
              type="text"
              name="ie"
              value={destinatario.ie}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Inscrição Estadual"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-white font-medium mb-1">E-mail</label>
            <input
              type="email"
              name="email"
              value={destinatario.email}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@exemplo.com"
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-white font-medium mb-1">Telefone</label>
            <input
              type="tel"
              name="telefone"
              value={destinatario.telefone}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="(00) 00000-0000"
            />
          </div>

          {/* CEP */}
          <div>
            <label className="block text-white font-medium mb-1">CEP</label>
            <input
              type="text"
              name="endereco_cep"
              value={destinatario.endereco_cep}
              onChange={(e) => onChange({ endereco_cep: formatCEP(e.target.value) })}
              onBlur={handleCEPBlur}
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="00000-000"
              maxLength={9}
            />
          </div>

          {/* Endereço */}
          <div className="md:col-span-2">
            <label className="block text-white font-medium mb-1">Logradouro</label>
            <input
              type="text"
              name="endereco_logradouro"
              value={destinatario.endereco_logradouro}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Rua, Avenida, etc."
            />
          </div>

          {/* Número */}
          <div>
            <label className="block text-white font-medium mb-1">Número</label>
            <input
              type="text"
              name="endereco_numero"
              value={destinatario.endereco_numero}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Número"
            />
          </div>

          {/* Complemento */}
          <div>
            <label className="block text-white font-medium mb-1">Complemento</label>
            <input
              type="text"
              name="endereco_complemento"
              value={destinatario.endereco_complemento}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Apto, Sala, etc."
            />
          </div>

          {/* Bairro */}
          <div>
            <label className="block text-white font-medium mb-1">Bairro</label>
            <input
              type="text"
              name="endereco_bairro"
              value={destinatario.endereco_bairro}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Bairro"
            />
          </div>

          {/* Município */}
          <div>
            <label className="block text-white font-medium mb-1">Município</label>
            <input
              type="text"
              name="endereco_municipio"
              value={destinatario.endereco_municipio}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Município"
            />
          </div>

          {/* UF */}
          <div>
            <label className="block text-white font-medium mb-1">UF</label>
            <select
              name="endereco_uf"
              value={destinatario.endereco_uf}
              onChange={handleChange}
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

          {/* País */}
          <div>
            <label className="block text-white font-medium mb-1">País</label>
            <input
              type="text"
              name="endereco_pais"
              value={destinatario.endereco_pais}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-600 text-white border border-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="País"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFEDestinatarioTab;
