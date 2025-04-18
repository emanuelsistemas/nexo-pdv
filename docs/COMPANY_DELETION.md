# Documentação: Processo de Deleção de Empresas

## Visão Geral

Este documento detalha o processo de deleção de empresas e seus dados relacionados no sistema Nexo PDV. A deleção de empresas é uma operação crítica que deve remover consistentemente todos os dados associados a uma empresa, incluindo seus usuários e dados de autenticação.

## 1. Função PostgreSQL (RPC) - Implementação Atual

### 1.1. Localização
A função está definida como `delete_company_and_related_data` e pode ser encontrada em:
- `supabase/Api-postgre/Supabase/complete_delete_function.sql` (implementação mais recente)
- `supabase/migrations/XXXXXXXX_company_deletion.sql` (após migração)

### 1.2. Processo de Deleção Completa

A função realiza as seguintes operações em ordem específica para evitar violações de chave estrangeira:

#### 1.2.1. Identificação
- Verifica se a empresa existe
- Coleta todos os IDs de usuários associados à empresa

#### 1.2.2. Deleção de Dados Operacionais
1. **Dados PDV**
   - pdv_cashier_movements (primeiro pois referencia pdv_cashiers)
   - pdv_cashiers
   - pdv_configurations

2. **Dados de Produtos**
   - product_stock_movements
   - products (após product_stock_movements)
   - product_groups
   - product_units
   - products_configurations

#### 1.2.3. Deleção de Usuários
3. **Perfis de Usuário**
   - **Deleção completa** dos perfis na tabela profiles

4. **Dados de Autenticação**
   - Remoção dos usuários em auth.users

#### 1.2.4. Deleção da Empresa
5. **Empresa**
   - Remoção do registro na tabela companies

### 1.3. Características da Implementação Atual

- **Tipo de Retorno:** `void` (não retorna valor)
- **Segurança:** `SECURITY DEFINER` (executa com as permissões do criador da função)
- **Linguagem:** `plpgsql`
- **Tratamento de Erro:** Logs detalhados para cada operação
- **Verificação:** Contabiliza registros afetados em cada operação

## 2. Guia para Futuras Atualizações

### 2.1. Adicionando Novas Tabelas ao Processo de Deleção

Quando novas tabelas que referenciam empresas forem adicionadas ao sistema, siga estas etapas:

1. **Analise a Estrutura da Tabela**:
   - Identifique a coluna que referencia `companies` (geralmente `company_id`)
   - Verifique se a tabela tem outras dependências

2. **Determine o Posicionamento na Ordem de Deleção**:
   - Tabelas que são referenciadas por outras devem ser deletadas por último
   - Tabelas que referenciam outras devem ser deletadas primeiro

3. **Atualize a Função RPC**:
   ```sql
   -- Exemplo de adição de nova tabela chamada 'new_table'
   DELETE FROM new_table
   WHERE company_id = target_company_id;
   GET DIAGNOSTICS affected_rows = ROW_COUNT;
   RAISE NOTICE 'Registros removidos de new_table: %', affected_rows;
   ```

4. **Teste a Modificação**:
   - Teste com empresas de desenvolvimento
   - Verifique logs para confirmar exclusão

### 2.2. Trabalhando com Tabelas que têm Dependências Complexas

Para tabelas com múltiplas dependências ou relacionamentos complexos:

1. **Mapeie a Cadeia de Dependências**:
   ```
   Tabela A → Tabela B → Tabela C
   ```

2. **Delete na Ordem Inversa da Hierarquia**:
   - Comece com as tabelas "filhas" (que dependem de outras)
   - Termine com as tabelas "pai"

3. **Use Subconsultas para Identificar Registros**:
   ```sql
   DELETE FROM child_table
   WHERE parent_id IN (
       SELECT id FROM parent_table WHERE company_id = target_company_id
   );
   ```

### 2.3. Práticas Recomendadas

1. **Sempre Mantenha Logs**:
   ```sql
   GET DIAGNOSTICS affected_rows = ROW_COUNT;
   RAISE NOTICE 'Operação em tabela_x: %', affected_rows;
   ```

2. **Preserve a Ordem de Deleção**:
   - Mantenha a estrutura atual da função
   - Insira novas tabelas no momento apropriado da sequência

3. **Documente Alterações**:
   - Atualize este documento quando novas tabelas forem adicionadas
   - Documente a versão da função em migrações

## 3. Solução de Problemas

### 3.1. Verificando se a Deleção foi Concluída Corretamente

Para verificar se uma empresa foi completamente excluída:

```sql
SELECT EXISTS(SELECT 1 FROM companies WHERE id = 'ID_DA_EMPRESA');
```

### 3.2. Verificando Dados Residuais

Se houver suspeita de dados remanescentes:

```sql
-- Verificar se há registros órfãos referenciando a empresa
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name = 'company_id'
  AND table_schema = 'public'
ORDER BY table_name;

-- Para cada tabela retornada, verificar:
SELECT COUNT(*) FROM [table_name] WHERE company_id = 'ID_DA_EMPRESA';
```

### 3.3. Scripts de Diagnóstico

Para diagnóstico de problemas, utilize os scripts em:
- `/supabase/Api-postgre/Supabase/debug_delete_function.py`
- `/supabase/Api-postgre/Supabase/test_delete_valesis_v2.py`

## 4. Implementação Técnica Atual

A implementação atual segue este padrão:

```sql
CREATE OR REPLACE FUNCTION delete_company_and_related_data(target_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_ids uuid[];
    affected_rows integer;
BEGIN
    -- Identificação de usuários
    SELECT ARRAY_AGG(id) INTO user_ids 
    FROM profiles 
    WHERE company_id = target_company_id;
    
    -- 1. Deleção de dados operacionais
    -- [aqui vão as operações DELETE...]
    
    -- 2. Deleção de usuários
    DELETE FROM profiles
    WHERE company_id = target_company_id;
    
    -- 3. Deleção de autenticação
    DELETE FROM auth.users 
    WHERE id = ANY(user_ids);
    
    -- 4. Deleção da empresa
    DELETE FROM companies 
    WHERE id = target_company_id;
END;
$$;
```
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_ids uuid[];
BEGIN
    -- Get user IDs
    SELECT ARRAY_AGG(id) INTO user_ids
    FROM profiles
    WHERE profiles.company_id = target_company_id;

    -- 1. PDV Data
    DELETE FROM pdv_cashier_movements 
    WHERE company_id = target_company_id;
    
    DELETE FROM pdv_cashiers 
    WHERE company_id = target_company_id;
    
    DELETE FROM pdv_configurations 
    WHERE company_id = target_company_id;

    -- 2. Product Data
    DELETE FROM product_stock_movements 
    WHERE company_id = target_company_id;
    
    DELETE FROM products 
    WHERE company_id = target_company_id;
    
    DELETE FROM product_groups 
    WHERE company_id = target_company_id;
    
    DELETE FROM product_units 
    WHERE company_id = target_company_id;
    
    DELETE FROM products_configurations 
    WHERE company_id = target_company_id;

    -- NOVA TABELA: Adicionar aqui, respeitando dependências
    DELETE FROM nova_tabela
    WHERE company_id = target_company_id;

    -- 3. Update Profiles
    UPDATE profiles 
    SET company_id = NULL,
        status_cad_empresa = 'N'
    WHERE company_id = target_company_id;

    -- 4. Delete Company
    DELETE FROM companies 
    WHERE id = target_company_id;

    -- 5. Delete Auth Users
    IF array_length(user_ids, 1) > 0 THEN
        DELETE FROM auth.users 
        WHERE id = ANY(user_ids);
    END IF;
END;
$$;
```

### 1.4. Regras para Adicionar Novas Tabelas

1. **Análise de Dependências**
   - Identifique todas as chaves estrangeiras
   - Mapeie relacionamentos com outras tabelas
   - Determine se há triggers ou políticas que possam afetar a deleção

2. **Posicionamento da Deleção**
   - Tabelas "filhas" devem ser deletadas antes das "pais"
   - Agrupe com outras tabelas relacionadas
   - Mantenha a ordem lógica do negócio

3. **Validação**
   - Teste a deleção com dados reais
   - Verifique se não há violações de chave estrangeira
   - Confirme se todos os dados relacionados foram removidos

### 1.5. Exemplo de Análise para Nova Tabela

```sql
-- 1. Criação da tabela
CREATE TABLE product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    product_id UUID NOT NULL REFERENCES products(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Análise de dependências
-- - Depende de: companies, products, auth.users
-- - Outros dependem dela: Não
-- - Conclusão: Deve ser deletada antes de products

-- 3. Atualização da função de deleção
CREATE OR REPLACE FUNCTION delete_company_and_related_data(target_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_ids uuid[];
BEGIN
    -- Get user IDs
    SELECT ARRAY_AGG(id) INTO user_ids
    FROM profiles
    WHERE profiles.company_id = target_company_id;

    -- 1. PDV Data
    -- ... (código existente)

    -- 2. Product Data
    -- Primeiro deletar reviews (nova tabela)
    DELETE FROM product_reviews 
    WHERE company_id = target_company_id;

    -- Depois continuar com as outras tabelas de produtos
    DELETE FROM product_stock_movements 
    WHERE company_id = target_company_id;
    -- ... (resto do código existente)
END;
$$;
```

## 2. Script Python

O script Python (`scripts/delete_company.py`) oferece uma alternativa mais flexível e com melhor logging para casos especiais.

### 2.1. Adicionando Novas Tabelas ao Script

1. Identifique o grupo apropriado (PDV, Produtos, etc.)
2. Adicione a deleção no método correspondente

Exemplo:

```python
async def delete_product_data(self) -> None:
    """Deleta dados relacionados a produtos"""
    try:
        # Primeiro deletar reviews (nova tabela)
        await supabase.table("product_reviews") \
            .delete() \
            .eq("company_id", self.company_id) \
            .execute()
        self.log("Reviews de produtos deletadas")

        # Continuar com as deleções existentes...
        await supabase.table("product_stock_movements") \
            .delete() \
            .eq("company_id", self.company_id) \
            .execute()
        self.log("Movimentações de estoque deletadas")
        
        # ... resto do código
    except Exception as e:
        self.log(f"Erro ao deletar dados de produtos: {str(e)}")
        raise
```

### 2.2. Criando Novo Grupo de Tabelas

Se a nova tabela não se encaixa nos grupos existentes:

1. Crie um novo método para o grupo
2. Adicione a chamada na sequência correta

Exemplo:

```python
async def delete_marketing_data(self) -> None:
    """Deleta dados relacionados a marketing"""
    try:
        # Deletar campanhas
        await supabase.table("marketing_campaigns") \
            .delete() \
            .eq("company_id", self.company_id) \
            .execute()
        self.log("Campanhas de marketing deletadas")

        # Deletar leads
        await supabase.table("marketing_leads") \
            .delete() \
            .eq("company_id", self.company_id) \
            .execute()
        self.log("Leads deletados")

    except Exception as e:
        self.log(f"Erro ao deletar dados de marketing: {str(e)}")
        raise

async def execute_deletion(self) -> None:
    """Executa o processo completo de deleção"""
    try:
        self.log(f"Iniciando processo de deleção para empresa {self.company_id}")
        
        # 1. Obtém IDs dos usuários
        self.user_ids = self.get_user_ids()
        
        # 2. Deleta dados do PDV
        await self.delete_pdv_data()
        
        # 3. Deleta dados de marketing (novo grupo)
        await self.delete_marketing_data()
        
        # 4. Deleta dados de produtos
        await self.delete_product_data()
        
        # ... resto do processo
    except Exception as e:
        self.log(f"ERRO FATAL: {str(e)}")
        raise
```

## 3. Boas Práticas

1. **Documentação**
   - Documente todas as dependências
   - Mantenha um diagrama atualizado das relações
   - Registre a ordem de deleção

2. **Testes**
   - Teste com dados reais
   - Verifique integridade após deleção
   - Teste cenários de erro

3. **Logging**
   - Mantenha logs detalhados
   - Registre todas as operações
   - Facilite o diagnóstico de problemas

4. **Segurança**
   - Use SECURITY DEFINER com cautela
   - Valide permissões
   - Proteja dados sensíveis

## 4. Checklist para Novas Tabelas

- [ ] Identificar todas as dependências
- [ ] Determinar o momento correto na sequência
- [ ] Atualizar função RPC
- [ ] Atualizar script Python
- [ ] Adicionar logs apropriados
- [ ] Testar com dados reais
- [ ] Documentar a mudança
- [ ] Verificar políticas de segurança
- [ ] Atualizar diagramas (se existirem)

## 5. Troubleshooting

### 5.1. Erros Comuns

1. **Violação de Chave Estrangeira**
   - Verifique a ordem de deleção
   - Identifique dependências faltantes
   - Confirme se todas as tabelas relacionadas estão incluídas

2. **Permissões**
   - Verifique as políticas RLS
   - Confirme as permissões do usuário
   - Verifique o SECURITY DEFINER

3. **Dados Órfãos**
   - Use queries para identificar dados órfãos
   - Implemente limpeza periódica
   - Adicione constraints apropriadas

### 5.2. Queries Úteis

```sql
-- Encontrar tabelas que referenciam companies
SELECT
    tc.table_schema, 
    tc.table_name, 
    kcu.column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND kcu.referenced_table_name = 'companies';

-- Verificar dados órfãos
SELECT * FROM tabela_exemplo
WHERE company_id NOT IN (SELECT id FROM companies);
```

## 6. Conclusão

A manutenção correta do processo de deleção é crucial para a integridade dos dados. Siga estas diretrizes ao adicionar novas tabelas e mantenha a documentação atualizada.