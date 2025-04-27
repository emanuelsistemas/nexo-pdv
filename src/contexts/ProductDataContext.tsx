import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

// Tipos
interface ProductUnit {
  id: string;
  code: string;
  name: string;
}

interface ProductGroup {
  id: string;
  name: string;
}

interface ProductDataContextType {
  units: ProductUnit[];
  groups: ProductGroup[];
  loadingUnits: boolean;
  loadingGroups: boolean;
  error: string | null;
  loadData: () => Promise<void>;
}

// Criação do contexto com valores iniciais
const ProductDataContext = createContext<ProductDataContextType>({
  units: [],
  groups: [],
  loadingUnits: false,
  loadingGroups: false,
  error: null,
  loadData: async () => {}
});

// Hook personalizado para acessar o contexto
export const useProductData = () => useContext(ProductDataContext);

// Componente Provider
export const ProductDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Função para carregar unidades
  const loadUnits = async () => {
    try {
      setLoadingUnits(true);
      
      // Obter usuário e empresa atual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Usuário não autenticado');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.company_id) {
        console.error('Empresa não encontrada');
        return;
      }
      
      // Usar o company_id do perfil do usuário
      const { data, error } = await supabase
        .from('product_units')
        .select('id, code, name')
        .eq('company_id', profile.company_id)
        .order('name', { ascending: true });
        
      if (error) {
        throw error;
      }
      
      // Garantir o tipo correto dos dados
      const typedData = data as ProductUnit[];
      setUnits(typedData);
      console.log('🌎 Context: Unidades carregadas:', typedData.length);
    } catch (error: any) {
      console.error('Erro ao carregar unidades:', error.message);
      setError(`Erro ao carregar unidades: ${error.message}`);
    } finally {
      setLoadingUnits(false);
    }
  };

  // Função para carregar grupos
  const loadGroups = async () => {
    try {
      setLoadingGroups(true);
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

      const { data: groupsData, error: groupsError } = await supabase
        .from('product_groups')
        .select('id, name')
        .eq('company_id', profile.company_id)
        .order('name', { ascending: true });
        
      if (groupsError) {
        throw groupsError;
      }
      
      // Garantir o tipo correto dos dados
      const typedGroups = (groupsData || []) as ProductGroup[];
      setGroups(typedGroups);
      console.log('🌎 Context: Grupos carregados:', typedGroups.length);
    } catch (error: any) {
      console.error('Erro ao carregar grupos:', error.message);
      setError(`Erro ao carregar grupos: ${error.message}`);
    } finally {
      setLoadingGroups(false);
    }
  };

  // Função para carregar todos os dados
  const loadData = async () => {
    setError(null);
    await Promise.all([loadUnits(), loadGroups()]);
  };

  // Carregar dados quando o contexto for inicializado
  useEffect(() => {
    // Verificar se o usuário está autenticado antes de carregar
    const checkAuthAndLoad = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        console.log('🌎 Context: Usuário autenticado, carregando dados globais...');
        loadData();
      }
    };
    
    checkAuthAndLoad();
  }, []);

  // Ouvir eventos de autenticação para recarregar dados quando necessário
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        console.log('🌎 Context: Evento de login detectado, carregando dados globais...');
        loadData();
      } else if (event === 'SIGNED_OUT') {
        // Limpar dados quando o usuário sair
        setUnits([]);
        setGroups([]);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <ProductDataContext.Provider
      value={{
        units,
        groups,
        loadingUnits,
        loadingGroups,
        error,
        loadData
      }}
    >
      {children}
    </ProductDataContext.Provider>
  );
};
