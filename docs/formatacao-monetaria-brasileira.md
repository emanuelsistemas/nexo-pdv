# Formatação Monetária Brasileira

## Visão Geral

Este documento detalha a implementação da formatação monetária brasileira no sistema Nexo PDV. A adaptação foi projetada para melhorar a usabilidade para usuários brasileiros, utilizando vírgula como separador decimal em toda a interface de usuário, enquanto mantém a compatibilidade com o banco de dados que utiliza o padrão internacional (ponto como separador decimal).

## ⚠️ IMPORTANTE: NÃO ALTERAR ESTE COMPORTAMENTO ⚠️

A implementação atual representa uma solução deliberada e cuidadosamente projetada. Qualquer alteração nesta abordagem pode causar problemas na experiência do usuário ou na consistência dos dados.

## Detalhes da Implementação

### Fluxo de Dados

1. **Leitura do Banco de Dados → Interface do Usuário:**
   - Valores numéricos são lidos do banco (com ponto como separador decimal)
   - São convertidos para strings com vírgula para exibição
   ```typescript
   // Exemplo na carga de dados do produto para edição
   setFormData({
     // ...outros campos
     cost_price: productToEdit.cost_price.toString().replace('.', ','),
     profit_margin: productToEdit.profit_margin.toString().replace('.', ','),
     selling_price: productToEdit.selling_price.toString().replace('.', ','),
     // ...outros campos
   });
   ```

2. **Validação e Formatação na Interface:**
   - Função `formatCurrency` garante a consistência do formato
   - Executada no evento `onBlur` dos campos monetários
   ```typescript
   // Função para formatar valores monetários no padrão brasileiro
   const formatCurrency = (value: string): string => {
     // Remove caracteres não numéricos e converte vírgula para ponto para cálculos internos
     const numericValue = value.replace(/[^0-9.,]/g, '').replace(',', '.');
     
     // Formata o valor com 2 casas decimais e converte de volta para o formato brasileiro
     return isNaN(parseFloat(numericValue)) 
       ? ''  // Retorna vazio se não for um número válido
       : parseFloat(numericValue).toFixed(2).replace('.', ',');
   };
   ```

3. **Cálculos Internos:**
   - Temporariamente converte vírgula para ponto para cálculos
   - Converte resultado de volta para vírgula para exibição
   ```typescript
   // Exemplo de cálculo (preço de venda baseado no custo e margem)
   if (newData.cost_price && newData.profit_margin) {
     // Para cálculos, converte vírgula para ponto
     const custoStr = newData.cost_price.replace(',', '.');
     const margemStr = newData.profit_margin.replace(',', '.');
     
     const custo = parseFloat(custoStr);
     const margem = parseFloat(margemStr);
     
     if (!isNaN(custo) && !isNaN(margem)) {
       const precoVenda = custo * (1 + margem / 100);
       // Formata no padrão brasileiro com vírgula
       newData.selling_price = precoVenda.toFixed(2).replace('.', ',');
     }
   }
   ```

4. **Interface do Usuário → Banco de Dados:**
   - Antes de salvar, strings com vírgula são convertidas para números com ponto
   ```typescript
   // Converte valores com vírgula para ponto antes de salvar
   const cost_price = formData.cost_price.replace(',', '.');
   const profit_margin = formData.profit_margin.replace(',', '.');
   const selling_price = formData.selling_price.replace(',', '.');
   const stock = formData.stock.replace(',', '.');
   
   const productData = {
     // ...outros campos
     cost_price: parseFloat(cost_price),
     profit_margin: parseFloat(profit_margin),
     selling_price: parseFloat(selling_price),
     // ...outros campos
   };
   ```

## Benefícios

1. **Melhor Usabilidade para Usuários Brasileiros:**
   - Alinhamento com as expectativas culturais (vírgula como separador decimal)
   - Redução de erros de entrada por parte dos usuários
   - Interface mais intuitiva para o contexto brasileiro

2. **Compatibilidade com o Banco de Dados:**
   - Mantém o padrão internacional no armazenamento (ponto como separador decimal)
   - Não requer alterações no esquema ou estrutura do banco de dados
   - Compatível com operações matemáticas e ordenações no banco de dados

3. **Consistência nos Cálculos:**
   - Cálculos precisos usando padrões numéricos em JavaScript
   - Formatação consistente de valores em toda a aplicação

## Considerações para Futuras Implementações

1. **Novas Telas e Componentes:**
   - Ao criar novos campos monetários, seguir o mesmo padrão de conversão
   - Utilizar o `handlePriceBlur` para formatação no evento `onBlur`
   - Converter vírgula para ponto antes de realizar cálculos

2. **Exibição de Dados:**
   - Sempre converter valores numéricos do banco para strings com vírgula ao exibir
   - Utilizar a função `formatCurrency` para garantir consistência na formatação

3. **Integração com APIs:**
   - Garantir que valores enviados para APIs externas estejam no formato esperado por elas
   - Converter conforme necessário na camada de comunicação com APIs

## Conclusão

Esta implementação atende às necessidades dos usuários brasileiros enquanto mantém a compatibilidade com os padrões internacionais de armazenamento de dados. Qualquer modificação neste comportamento deve ser cuidadosamente considerada e documentada.
