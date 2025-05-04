import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function DiagnosticPage() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [localStorageConfig, setLocalStorageConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resellers, setResellers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any>(null);
  
  useEffect(() => {
    loadData();
  }, []);
  
  // Carrega dados do usuário e configurações
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Buscar sessão atual
      const { data: { session } } = await supabase.auth.getSession();
      setSessions(session);
      
      if (session) {
        // Buscar informações do usuário
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (userError) {
          console.error('Erro ao buscar dados do usuário:', userError);
          setError(userError.message);
        } else if (userData) {
          setUserInfo(userData);
          
          // Se o usuário tiver reseller_id, buscar configurações
          if (userData.reseller_id) {
            const { data: configData, error: configError } = await supabase
              .from('nexochat_config')
              .select('*')
              .eq('reseller_id', userData.reseller_id)
              .single();
            
            if (configError) {
              console.error('Erro ao buscar configurações:', configError);
              setError(configError.message);
            } else {
              setConfig(configData);
            }
          }
        }
      }
      
      // Buscar todos os resellers para referência
      const { data: resellersData, error: resellersError } = await supabase
        .from('resellers')
        .select('id, name, description')
        .order('name');
      
      if (resellersError) {
        console.error('Erro ao buscar resellers:', resellersError);
      } else {
        setResellers(resellersData || []);
      }
      
      // Checar localStorage
      try {
        const savedConfig = localStorage.getItem('nexochat_config');
        if (savedConfig) {
          setLocalStorageConfig(JSON.parse(savedConfig));
        }
      } catch (e) {
        console.error('Erro ao ler localStorage:', e);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Diagnóstico do Sistema</h1>
        
        {isLoading ? (
          <div className="p-4 bg-white rounded-md shadow text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mx-auto mb-2"></div>
            <p>Carregando informações...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-100 text-red-800 rounded-md shadow mb-4">
            <h2 className="font-bold mb-1">Erro</h2>
            <p>{error}</p>
            <button 
              onClick={loadData}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <>
            {/* Informações da sessão */}
            <div className="p-4 bg-white rounded-md shadow mb-4">
              <h2 className="text-lg font-medium mb-2">Sessão</h2>
              {sessions ? (
                <div className="text-sm">
                  <p><strong>ID do usuário:</strong> {sessions.user.id}</p>
                  <p><strong>Email:</strong> {sessions.user.email}</p>
                  <p><strong>Expira em:</strong> {new Date(sessions.expires_at * 1000).toLocaleString()}</p>
                </div>
              ) : (
                <p className="text-sm text-red-600">Usuário não está logado</p>
              )}
            </div>
            
            {/* Informações do usuário */}
            <div className="p-4 bg-white rounded-md shadow mb-4">
              <h2 className="text-lg font-medium mb-2">Usuário</h2>
              {userInfo ? (
                <div className="text-sm">
                  <p><strong>Nome:</strong> {userInfo.name || 'N/A'}</p>
                  <p><strong>ID da Revenda:</strong> {userInfo.reseller_id || 'N/A'}</p>
                  {userInfo.reseller_id && (
                    <p className="bg-yellow-100 p-2 mt-2 rounded-md">
                      <strong>Atenção:</strong> Este é o ID da Revenda que você deve usar nos testes:
                      <span className="font-mono bg-yellow-200 px-2 py-1 rounded ml-1">
                        {userInfo.reseller_id}
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Informações do usuário não disponíveis</p>
              )}
            </div>
            
            {/* Configuração no banco */}
            <div className="p-4 bg-white rounded-md shadow mb-4">
              <h2 className="text-lg font-medium mb-2">Configuração no Banco de Dados</h2>
              {config ? (
                <div className="text-sm">
                  <p><strong>URL da API:</strong> {config.evolution_api_url || 'N/A'}</p>
                  <p><strong>API Key:</strong> {config.evolution_api_key ? 
                    `${config.evolution_api_key.substring(0, 5)}...${
                      config.evolution_api_key.substring(config.evolution_api_key.length - 5)
                    }` : 'N/A'}</p>
                  <p><strong>Nome da Instância:</strong> {config.instance_name || 'N/A'}</p>
                  
                  {/* Botões para testar e usar configuração */}
                  <div className="mt-3 flex gap-2">
                    <button
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      onClick={() => {
                        if (config) {
                          const newConfig = {
                            baseUrl: config.evolution_api_url,
                            apikey: config.evolution_api_key,
                            instanceName: config.instance_name
                          };
                          localStorage.setItem('nexochat_config', JSON.stringify(newConfig));
                          setLocalStorageConfig(newConfig);
                          alert('Configuração salva no localStorage');
                        }
                      }}
                    >
                      Salvar no localStorage
                    </button>
                    
                    <button
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      onClick={async () => {
                        if (config?.evolution_api_url) {
                          try {
                            const response = await fetch(`${config.evolution_api_url}/instance/connectionState/${config.instance_name}`, {
                              headers: { 'apikey': config.evolution_api_key }
                            });
                            if (response.ok) {
                              alert(`API respondeu com sucesso: ${response.status}`);
                            } else {
                              alert(`API respondeu com erro: ${response.status} ${response.statusText}`);
                            }
                          } catch (err) {
                            alert(`Erro ao testar API: ${err instanceof Error ? err.message : String(err)}`);
                          }
                        }
                      }}
                    >
                      Testar API
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Nenhuma configuração encontrada no banco para este usuário/revenda
                </p>
              )}
            </div>
            
            {/* Configuração no localStorage */}
            <div className="p-4 bg-white rounded-md shadow mb-4">
              <h2 className="text-lg font-medium mb-2">Configuração no localStorage</h2>
              {localStorageConfig ? (
                <div className="text-sm">
                  <p><strong>URL da API:</strong> {localStorageConfig.baseUrl || 'N/A'}</p>
                  <p><strong>API Key:</strong> {localStorageConfig.apikey ? 
                    `${localStorageConfig.apikey.substring(0, 5)}...${
                      localStorageConfig.apikey.substring(localStorageConfig.apikey.length - 5)
                    }` : 'N/A'}</p>
                  <p><strong>Nome da Instância:</strong> {localStorageConfig.instanceName || 'N/A'}</p>
                  
                  <div className="mt-3 flex gap-2">
                    <button
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      onClick={() => {
                        localStorage.removeItem('nexochat_config');
                        setLocalStorageConfig(null);
                        alert('Configuração removida do localStorage');
                      }}
                    >
                      Limpar localStorage
                    </button>
                    
                    <button
                      className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                      onClick={async () => {
                        if (localStorageConfig?.baseUrl) {
                          try {
                            const response = await fetch(`${localStorageConfig.baseUrl}/instance/connectionState/${localStorageConfig.instanceName}`, {
                              headers: { 'apikey': localStorageConfig.apikey }
                            });
                            if (response.ok) {
                              alert(`API respondeu com sucesso: ${response.status}`);
                            } else {
                              alert(`API respondeu com erro: ${response.status} ${response.statusText}`);
                            }
                          } catch (err) {
                            alert(`Erro ao testar API: ${err instanceof Error ? err.message : String(err)}`);
                          }
                        }
                      }}
                    >
                      Testar API
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Nenhuma configuração encontrada no localStorage
                </p>
              )}
            </div>
            
            {/* Lista de Revendas */}
            <div className="p-4 bg-white rounded-md shadow mb-4">
              <h2 className="text-lg font-medium mb-2">Revendas Disponíveis</h2>
              <p className="mb-2 text-sm">Selecione uma revenda para buscar sua configuração:</p>
              
              {resellers.length > 0 ? (
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">ID</th>
                        <th className="px-3 py-2 text-left">Nome</th>
                        <th className="px-3 py-2 text-left">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resellers.map(reseller => (
                        <tr key={reseller.id} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-xs">{reseller.id}</td>
                          <td className="px-3 py-2">{reseller.name}</td>
                          <td className="px-3 py-2">
                            <button
                              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                              onClick={async () => {
                                try {
                                  setIsLoading(true);
                                  const { data, error } = await supabase
                                    .from('nexochat_config')
                                    .select('*')
                                    .eq('reseller_id', reseller.id)
                                    .single();
                                  
                                  setIsLoading(false);
                                  
                                  if (error) {
                                    alert(`Erro ao buscar configuração: ${error.message}`);
                                  } else if (data) {
                                    setConfig(data);
                                    alert(`Configuração da revenda "${reseller.name}" carregada com sucesso!`);
                                  } else {
                                    alert(`Nenhuma configuração encontrada para a revenda "${reseller.name}"`);
                                  }
                                } catch (err) {
                                  setIsLoading(false);
                                  alert(`Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
                                }
                              }}
                            >
                              Carregar Config
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Nenhuma revenda encontrada no sistema
                </p>
              )}
            </div>
            
            {/* Links para testes */}
            <div className="p-4 bg-white rounded-md shadow mb-4">
              <h2 className="text-lg font-medium mb-2">Links para Testes</h2>
              <div className="flex flex-col md:flex-row gap-2">
                <a
                  href="/admin/simple-socket"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-purple-600 text-white text-sm rounded text-center hover:bg-purple-700"
                >
                  Teste de Socket.io Simples
                </a>
                <a
                  href="/admin/test-socketio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-indigo-600 text-white text-sm rounded text-center hover:bg-indigo-700"
                >
                  Teste de Socket.io Avançado
                </a>
                <a
                  href="/admin/chat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-emerald-600 text-white text-sm rounded text-center hover:bg-emerald-700"
                >
                  ChatNexo (original, que funciona)
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
