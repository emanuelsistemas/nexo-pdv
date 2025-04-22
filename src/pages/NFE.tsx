import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  X,
  FileText, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Printer,
  Copy,
  Edit,
  Trash2,
  ArrowUpDown,
  ArrowDownAZ,
  ArrowUpAZ
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AppFooter } from '../components/AppFooter';
import { NFEPanel } from '../components/NFEPanel';

interface NFE {
  id: string;
  numero: number;
  chave_acesso: string;
  data_emissao: string;
  valor_total: number;
  destinatario_nome: string;
  status: 'RASCUNHO' | 'ENVIADA' | 'AUTORIZADA' | 'REJEITADA' | 'CANCELADA';
  itens: number;
}

const statusColors = {
  RASCUNHO: 'bg-slate-400',
  ENVIADA: 'bg-blue-400',
  AUTORIZADA: 'bg-green-400',
  REJEITADA: 'bg-red-400',
  CANCELADA: 'bg-amber-400'
};

const statusLabels = {
  RASCUNHO: 'Rascunho',
  ENVIADA: 'Enviada',
  AUTORIZADA: 'Autorizada',
  REJEITADA: 'Rejeitada',
  CANCELADA: 'Cancelada'
};

export default function NFE() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(false);
  const [showNFEPanel, setShowNFEPanel] = useState(false);
  const [selectedNFE, setSelectedNFE] = useState<NFE | null>(null);
  
  // Dados simulados para a grid
  let nfeList: NFE[] = [
    {
      id: '1',
      numero: 1001,
      chave_acesso: '35230607608152000136550010000010011648843271',
      data_emissao: '22/04/2025',
      valor_total: 2850.75,
      destinatario_nome: 'Empresa ABC Ltda',
      status: 'AUTORIZADA',
      itens: 8
    },
    {
      id: '2',
      numero: 1002,
      chave_acesso: '35230607608152000136550010000010021947582010',
      data_emissao: '21/04/2025',
      valor_total: 1250.30,
      destinatario_nome: 'Comercial XYZ S/A',
      status: 'ENVIADA',
      itens: 5
    },
    {
      id: '3',
      numero: 1003,
      chave_acesso: '',
      data_emissao: '20/04/2025',
      valor_total: 750.00,
      destinatario_nome: 'João Silva ME',
      status: 'RASCUNHO',
      itens: 3
    },
    {
      id: '4',
      numero: 1004,
      chave_acesso: '35230607608152000136550010000010041648843274',
      data_emissao: '19/04/2025',
      valor_total: 4250.90,
      destinatario_nome: 'Distribuidora A&B Ltda',
      status: 'REJEITADA',
      itens: 12
    },
    {
      id: '5',
      numero: 1005,
      chave_acesso: '35230607608152000136550010000010051947582015',
      data_emissao: '18/04/2025',
      valor_total: 3120.50,
      destinatario_nome: 'Supermercado Central',
      status: 'CANCELADA',
      itens: 6
    },
  ];

  const handleSort = (field: string) => {
    // Se já estiver ordenando por este campo, inverte a direção
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Caso contrário, começa a ordenar por este campo em ordem ascendente
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Ordenação da lista
  if (sortField) {
    nfeList = [...nfeList].sort((a, b) => {
      let valueA, valueB;

      // Determinar quais valores comparar com base no campo de ordenação
      switch (sortField) {
        case 'numero':
          valueA = a.numero;
          valueB = b.numero;
          break;
        case 'destinatario':
          valueA = a.destinatario_nome.toLowerCase();
          valueB = b.destinatario_nome.toLowerCase();
          break;
        case 'data':
          // Convertendo data no formato DD/MM/YYYY para comparação
          const [dayA, monthA, yearA] = a.data_emissao.split('/');
          const [dayB, monthB, yearB] = b.data_emissao.split('/');
          valueA = new Date(`${yearA}-${monthA}-${dayA}`);
          valueB = new Date(`${yearB}-${monthB}-${dayB}`);
          break;
        case 'valor':
          valueA = a.valor_total;
          valueB = b.valor_total;
          break;
        case 'status':
          valueA = a.status;
          valueB = b.status;
          break;
        case 'itens':
          valueA = a.itens;
          valueB = b.itens;
          break;
        default:
          return 0;
      }

      // Compara os valores na direção apropriada
      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const handleRefresh = () => {
    toast.info('Atualizando dados...');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Dados atualizados com sucesso!');
    }, 500);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Filtra a lista com base no termo de busca
  const filteredNFEs = nfeList.filter(nfe => {
    const query = searchQuery.toLowerCase();
    return (
      nfe.numero.toString().includes(query) ||
      nfe.destinatario_nome.toLowerCase().includes(query) ||
      nfe.chave_acesso.toLowerCase().includes(query)
    );
  });

  // Função para tratar quando uma NF-e é editada
  const handleEditNFE = (nfe: NFE) => {
    setSelectedNFE(nfe);
    setShowNFEPanel(true);
  };

  // Função para tratar quando uma NF-e é salva no painel
  const handleNFESaved = () => {
    toast.success('NF-e salva com sucesso!');
    setShowNFEPanel(false);
    handleRefresh();
  };



  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-semibold text-white ml-2 hidden sm:block">Notas Fiscais Eletrônicas</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar NF-e..."
                value={searchQuery}
                onChange={handleSearch}
                className="bg-slate-700 text-white py-2 pl-10 pr-4 rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 w-48 sm:w-64"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={16} />
              </div>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              onClick={handleRefresh}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4">
          <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden border border-slate-700">
            {/* Card Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="text-blue-400" size={20} />
                <h2 className="text-white font-medium">Lista de NF-e</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedNFE(null); // Nova NF-e, sem dados pré-existentes
                    setShowNFEPanel(true);
                  }}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm transition-colors"
                >
                  <Plus size={16} />
                  <span>Nova NF-e</span>
                </button>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center p-12">
                <div className="flex flex-col items-center">
                  <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <p className="text-slate-400 mt-4">Carregando notas fiscais...</p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredNFEs.length === 0 && (
              <div className="flex flex-col items-center justify-center p-12">
                <FileText size={48} className="text-slate-500 mb-4" />
                <h3 className="text-white font-medium text-lg">Nenhuma NF-e encontrada</h3>
                {searchQuery ? (
                  <p className="text-slate-400 mt-1">Tente uma busca diferente</p>
                ) : (
                  <p className="text-slate-400 mt-1">Clique em "Nova NF-e" para criar sua primeira nota fiscal</p>
                )}
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-4 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
                  >
                    Limpar busca
                  </button>
                )}
              </div>
            )}

            {/* Data Table */}
            {!isLoading && filteredNFEs.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-700">
                      <th className="text-left p-4 text-slate-400 font-medium">
                        <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('numero')}>
                          Número
                          {sortField === 'numero' ? (
                            sortDirection === 'asc' ? (
                              <ArrowDownAZ size={16} className="text-blue-400" />
                            ) : (
                              <ArrowUpAZ size={16} className="text-blue-400" />
                            )
                          ) : (
                            <ArrowDownAZ size={16} className="opacity-40" />
                          )}
                        </div>
                      </th>
                      <th className="text-left p-4 text-slate-400 font-medium">
                        <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('destinatario')}>
                          Destinatário
                          {sortField === 'destinatario' ? (
                            sortDirection === 'asc' ? (
                              <ArrowDownAZ size={16} className="text-blue-400" />
                            ) : (
                              <ArrowUpAZ size={16} className="text-blue-400" />
                            )
                          ) : (
                            <ArrowDownAZ size={16} className="opacity-40" />
                          )}
                        </div>
                      </th>
                      <th className="text-left p-4 text-slate-400 font-medium">
                        <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('data')}>
                          Emissão
                          {sortField === 'data' ? (
                            sortDirection === 'asc' ? (
                              <ArrowDownAZ size={16} className="text-blue-400" />
                            ) : (
                              <ArrowUpAZ size={16} className="text-blue-400" />
                            )
                          ) : (
                            <ArrowDownAZ size={16} className="opacity-40" />
                          )}
                        </div>
                      </th>
                      <th className="text-left p-4 text-slate-400 font-medium">
                        <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('valor')}>
                          Valor
                          {sortField === 'valor' ? (
                            sortDirection === 'asc' ? (
                              <ArrowUpDown size={14} className="text-blue-400" />
                            ) : (
                              <ArrowUpDown size={14} className="text-blue-400 rotate-180" />
                            )
                          ) : (
                            <ArrowUpDown size={14} className="opacity-40" />
                          )}
                        </div>
                      </th>
                      <th className="text-left p-4 text-slate-400 font-medium">
                        <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('status')}>
                          Status
                          {sortField === 'status' ? (
                            sortDirection === 'asc' ? (
                              <ArrowDownAZ size={16} className="text-blue-400" />
                            ) : (
                              <ArrowUpAZ size={16} className="text-blue-400" />
                            )
                          ) : (
                            <ArrowDownAZ size={16} className="opacity-40" />
                          )}
                        </div>
                      </th>
                      <th className="text-left p-4 text-slate-400 font-medium">
                        <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('itens')}>
                          Itens
                          {sortField === 'itens' ? (
                            sortDirection === 'asc' ? (
                              <ArrowUpDown size={14} className="text-blue-400" />
                            ) : (
                              <ArrowUpDown size={14} className="text-blue-400 rotate-180" />
                            )
                          ) : (
                            <ArrowUpDown size={14} className="opacity-40" />
                          )}
                        </div>
                      </th>
                      <th className="p-4 text-slate-400 font-medium w-[100px]">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNFEs.map((nfe) => (
                      <tr key={nfe.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                        <td className="p-4 text-slate-200">#{nfe.numero}</td>
                        <td className="p-4 text-slate-200">{nfe.destinatario_nome}</td>
                        <td className="p-4 text-slate-200">{nfe.data_emissao}</td>
                        <td className="p-4 text-slate-200">R$ {nfe.valor_total.toFixed(2)}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[nfe.status]}`}>
                            {statusLabels[nfe.status]}
                          </span>
                        </td>
                        <td className="p-4 text-slate-200">{nfe.itens}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              className="p-1 text-slate-400 hover:text-slate-200"
                              title="Imprimir"
                            >
                              <Printer size={16} />
                            </button>
                            <button 
                              className="p-1 text-slate-400 hover:text-slate-200"
                              title="Copiar"
                            >
                              <Copy size={16} />
                            </button>
                            <button 
                              className="p-1 text-slate-400 hover:text-slate-200" 
                              title="Editar"
                              onClick={() => handleEditNFE(nfe)}
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              className="p-1 text-red-400 hover:text-red-300"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!isLoading && filteredNFEs.length > 0 && (
              <div className="p-4 border-t border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    Mostrando {filteredNFEs.length} de {filteredNFEs.length} resultados
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled
                      className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-50"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      disabled
                      className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-50"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <AppFooter />

      {/* Painel de criação/edição de NF-e */}
      <NFEPanel
        isOpen={showNFEPanel}
        onClose={() => setShowNFEPanel(false)}
        nfe={selectedNFE}
        onSave={handleNFESaved}
      />
    </div>
  );
}
