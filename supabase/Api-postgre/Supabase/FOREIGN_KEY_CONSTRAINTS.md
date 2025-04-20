# Documentação sobre Restrições de Chave Estrangeira no Supabase

## Problema Identificado

Em 19/04/2025, foi identificado um problema na restrição de chave estrangeira entre as tabelas `companies` e `resellers`. A restrição `companies_reseller_id_fkey` estava incorretamente configurada para referenciar a própria tabela `companies` em vez da tabela `resellers`.

```
Restrição: companies_reseller_id_fkey
Tabela: companies
Coluna: reseller_id
Referencia Tabela: companies  <-- ERRO! Deveria ser "resellers"
Referencia Coluna: id
```

Este erro causava a seguinte mensagem quando tentávamos criar uma empresa vinculada a um revendedor:

```
Erro ao criar empresa: insert or update on table "companies" violates foreign key constraint "companies_reseller_id_fkey"
```

## Diagnóstico

Para diagnosticar o problema, foi criado um script `check_reseller_issue.py` que:

1. Verificou a estrutura das tabelas `resellers` e `companies`
2. Verificou a restrição de chave estrangeira entre as tabelas
3. Verificou a existência de revendedores específicos (códigos 20053 e 58105)
4. Verificou se havia empresas vinculadas a esses revendedores

O diagnóstico confirmou que a restrição de chave estrangeira estava incorretamente configurada.

## Solução

Para corrigir o problema, foi criado um script `fix_reseller_foreign_key.py` que:

1. Removeu a restrição de chave estrangeira incorreta
2. Adicionou a restrição de chave estrangeira correta

```sql
-- Remover a restrição incorreta
ALTER TABLE companies DROP CONSTRAINT companies_reseller_id_fkey;

-- Adicionar a restrição correta
ALTER TABLE companies 
ADD CONSTRAINT companies_reseller_id_fkey 
FOREIGN KEY (reseller_id) 
REFERENCES resellers(id);
```

Após a correção, a restrição de chave estrangeira ficou configurada corretamente:

```
Restrição: companies_reseller_id_fkey
Tabela: companies
Coluna: reseller_id
Referencia Tabela: resellers
Referencia Coluna: id
```

## Como Verificar Restrições de Chave Estrangeira

Para verificar as restrições de chave estrangeira em uma tabela, você pode usar a seguinte consulta SQL:

```sql
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'nome_da_tabela';
```

Substitua `'nome_da_tabela'` pelo nome da tabela que você deseja verificar.

## Boas Práticas para Restrições de Chave Estrangeira

1. **Nomeação Consistente**: Use um padrão de nomenclatura consistente para restrições de chave estrangeira, como `fk_tabela_coluna`.

2. **Verificação Após Criação**: Sempre verifique se a restrição foi criada corretamente após adicioná-la.

3. **Documentação**: Documente todas as restrições de chave estrangeira em um lugar centralizado.

4. **Testes**: Crie testes que verificam se as restrições de chave estrangeira estão funcionando corretamente.

5. **Migrações**: Ao criar migrações que adicionam restrições de chave estrangeira, inclua verificações para garantir que a restrição foi criada corretamente.

## Scripts de Utilidade

Os seguintes scripts foram criados para ajudar a diagnosticar e corrigir problemas com restrições de chave estrangeira:

- `check_reseller_issue.py`: Verifica a estrutura das tabelas e as restrições de chave estrangeira.
- `fix_reseller_foreign_key.py`: Corrige a restrição de chave estrangeira entre as tabelas `companies` e `resellers`.

Esses scripts podem ser adaptados para verificar e corrigir outras restrições de chave estrangeira no banco de dados.