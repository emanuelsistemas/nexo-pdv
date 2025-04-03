import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, FileText, Calendar, Filter, X, ChevronLeft, ChevronRight, MoreVertical, Printer, Trash2, Copy, Edit, ArrowUpDown, ArrowDownAZ, ArrowUpAZ } from 'lucide-react';
import { Logo } from '../components/Logo';

export default function Orcamento() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

  // Mock data for demonstration
  let orcamentos = [
    {
      id: '1',
      numero: '0001',
      cliente: 'João Silva',
      data: '25/03/2025',
      valor: 1250.00,
      status: 'pending',
      items: 5
    },
    {
      id: '2',
      numero: '0002',
      cliente: 'Maria Santos',
      data: '25/03/2025',
      valor: 850.50,
      status: 'approved',
      items: 3
    },
    {
      id: '3',
      numero: '0003',
      cliente: 'Pedro Oliveira',
      data: '24/03/2025',
      valor: 2100.75,
      status: 'converted',
      items: 8
    },
    {
      id: '4',
      numero: '0004',
      cliente: 'Ana Costa',
      data: '24/03/2025',
      valor: 450.25,
      status: 'expired',
      items: 2
    }
  ];

  // Ordenação
  if (sortField) {
    orcamentos = [...orcamentos].sort((a, b) => {
      let valueA, valueB;

      // Determinar quais valores comparar com base no campo de ordenação
      switch (sortField) {
        case 'numero':
          valueA = parseInt(a.numero);
          valueB = parseInt(b.numero);
          break;
        case 'cliente':
          valueA = a.cliente.toLowerCase();
          valueB = b.cliente.toLowerCase();
          break;
        case 'data':
          // Convertendo data no formato DD/MM/YYYY para comparação
          const [dayA, monthA, yearA] = a.data.split('/');
          const [dayB, monthB, yearB] = b.data.split('/');
          valueA = new Date(`${yearA}-${monthA}-${dayA}`);
          valueB = new Date(`${yearB}-${monthB}-${dayB}`);
          break;
        case 'valor':
          valueA = a.valor;
          valueB = b.valor;
          break;
        case 'status':
          valueA = a.status;
          valueB = b.status;
          break;
        case 'items':
          valueA = a.items;
          valueB = b.items;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'approved':
        return 'bg-blue-500/10 text-blue-500';
      case 'converted':
        return 'bg-green-500/10 text-green-500';
      case 'expired':
        return 'bg-red-500/10 text-red-400';
      default:
        return 'bg-slate-500/10 text-slate-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'approved':
        return 'Aprovado';
      case 'converted':
        return 'Convertido';
      case 'expired':
        return 'Expirado';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="flex items-center justify-between h-12 px-4">
          <div className="flex items-center gap-6">
            <Logo variant="dashboard" />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-slate-400 hover:text-slate-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bg-slate-800/50 border-b border-slate-700">
        <div className="p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Pesquisar orçamentos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 rounded-lg text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 rounded-lg text-slate-200 hover:bg-slate-600 transition-colors"
              >
                <Filter size={20} />
                <span>Filtros</span>
              </button>
              <button
                className="flex items-center gap-2 px-3 py-2 bg-blue-500 rounded-lg text-white hover:bg-blue-400 transition-colors"
              >
                <Plus size={20} />
                <span>Novo Orçamento</span>
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Data Inicial
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Data Final
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="all">Todos</option>
                    <option value="pending">Pendente</option>
                    <option value="approved">Aprovado</option>
                    <option value="converted">Convertido</option>
                    <option value="expired">Expirado</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        <div className="bg-slate-800 rounded-lg border border-slate-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left p-4 text-slate-400 font-medium">
                    <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('numero')}>
                      Número
                      {sortField === 'numero' ? (
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
                    <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('cliente')}>
                      Cliente
                      {sortField === 'cliente' ? (
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
                      Data
                      {sortField === 'data' ? (
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
                    <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('items')}>
                      Itens
                      {sortField === 'items' ? (
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
                {orcamentos.map((orcamento) => (
                  <tr key={orcamento.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                    <td className="p-4 text-slate-200">#{orcamento.numero}</td>
                    <td className="p-4 text-slate-200">{orcamento.cliente}</td>
                    <td className="p-4 text-slate-200">{orcamento.data}</td>
                    <td className="p-4 text-slate-200">R$ {orcamento.valor.toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(orcamento.status)}`}>
                        {getStatusText(orcamento.status)}
                      </span>
                    </td>
                    <td className="p-4 text-slate-200">{orcamento.items}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1 text-slate-400 hover:text-slate-200">
                          <Printer size={16} />
                        </button>
                        <button className="p-1 text-slate-400 hover:text-slate-200">
                          <Copy size={16} />
                        </button>
                        <button className="p-1 text-slate-400 hover:text-slate-200">
                          <Edit size={16} />
                        </button>
                        <button className="p-1 text-red-400 hover:text-red-300">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Mostrando 1-4 de 4 resultados
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
        </div>
      </div>
    </div>
  );
}
