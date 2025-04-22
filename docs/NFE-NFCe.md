# Guia de Implementação de NF-e/NFC-e para Nexo PDV

## 1. Visão Geral da Arquitetura

A implementação correta de documentos fiscais eletrônicos requer uma arquitetura em camadas:

```
[UI/Frontend] <-> [Controladores] <-> [Serviços Fiscais] <-> [Web Services SEFAZ]
                         ↓                    ↓
                   [Banco de Dados]     [Certificado Digital]
```

### 1.1. Biblioteca sped-nfe

Uma das decisões estratégicas para acelerar o desenvolvimento é utilizar a biblioteca [sped-nfe](https://github.com/nfephp-org/sped-nfe) da comunidade NFePHP. Esta API robusta facilita:

- Geração e validação dos XMLs conforme schemas oficiais da SEFAZ
- Comunicação direta com web services de todas as UFs
- Cálculos automáticos de impostos conforme a legislação
- Tratamento de contingenciamento e outras situações específicas
- Compatibilidade com as mais recentes Notas Técnicas da SEFAZ

A arquitetura planejada do módulo fiscal irá funcionar da seguinte forma:

```
[Frontend React] <-> [API Node.js] <-> [Serviço PHP com sped-nfe] <-> [SEFAZ]
                          ↓
                    [Supabase DB]
```

## 2. Pré-requisitos Essenciais

- [x] Certificado Digital A1 ou A3 (já configurado na aba Sistema)
- [ ] Cadastro na SEFAZ do estado (Produtor/Contribuinte)
- [ ] Credenciais de acesso aos Web Services (homologação e produção)
- [ ] CSC (Código de Segurança do Contribuinte) para NFC-e

## 3. Etapas de Implementação Técnica

### 3.1. Configurações Base

1. **Configuração do Sistema**:
   - [x] Armazenamento e gerenciamento do certificado digital
   - [x] Configuração das informações da empresa emitente

2. **Configurações específicas NF-e (modelo 55)**:
   - [x] Série e numeração
   - [x] Ambiente (homologação/produção)

3. **Configurações específicas NFC-e (modelo 65)**:
   - [x] Série e numeração
   - [x] CSC ID e CSC Token
   - [x] Ambiente (homologação/produção)

### 3.2. Cadastros Auxiliares

1. **Cadastro de Produtos**:
   - [x] Código
   - [x] Descrição
   - [x] Unidade de medida
   - [ ] **Informações Fiscais**:
     - [ ] NCM
     - [ ] CFOP
     - [ ] CEST (quando aplicável)
     - [ ] CST/CSOSN
     - [ ] Alíquotas (ICMS, IPI, PIS, COFINS)

2. **Cadastro de Clientes/Destinatários**:
   - [ ] Dados de identificação (CNPJ/CPF)
   - [ ] Endereço completo
   - [ ] Inscrição estadual (quando aplicável)
### 3.3. Implementação dos Serviços Fiscais (Core) com sped-nfe

1. **Integração da Biblioteca sped-nfe**:
   - [ ] Criar serviço PHP para hospedar a biblioteca sped-nfe
   - [ ] Configurar endpoints REST para comunicação entre frontend/API e o serviço fiscal
   - [ ] Configurar ambiente de execução PHP 7.x+ conforme requisitos da biblioteca

2. **Implementação com sped-nfe**:
   - [ ] Configurar ambiente conforme classe `Config`
   - [ ] Implementar uso da classe `Tools` para comunicação com SEFAZ
   - [ ] Implementar uso da classe `Make` para construção de XMLs
   - [ ] Adaptar código para tratar respostas e retornos da SEFAZ

3. **Serviços a serem implementados via sped-nfe**:
   - [ ] Verificar status (`statusServico`)
   - [ ] Autorização de NF-e/NFC-e (`autorizacao` e `retAutorizacao`)
   - [ ] Cancelamento e outras operações (`evento`)
   - [ ] Inutilização de numeração (`inutilizacao`)
   - [ ] Consultas diversas (`consultaProtocolo`, `consultaChave`)
   - [ ] Geração de QR-Code para NFC-e

4. **Construção de XMLs via Make**:
   - [ ] Adaptar estrutura de dados do frontend para objetos `stdClass` compatíveis
   - [ ] Seguir ordem correta dos métodos da classe `Make` conforme documentação
   - [ ] Implementar validações prévias dos dados antes do envio
   - [ ] Tratar cálculos de impostos via classes auxiliares ou métodos da biblioteca

### 3.4. Interface do Usuário

1. **Emissão de NF-e (Modelo 55)**:
   - [ ] Interface para seleção de produtos/itens
   - [ ] Campos para informações do destinatário
   - [ ] Campos para informações de transporte
   - [ ] Campos para informações de pagamento
   - [ ] Visualização prévia do documento
   - [ ] Emissão e impressão do DANFE

2. **PDV para NFC-e (Modelo 65)**:
   - [ ] Interface simples e rápida para vendas
   - [ ] Seleção de produtos
   - [ ] Formas de pagamento
   - [ ] Emissão
   - [ ] Impressão do DANFE-NFC-e ou envio por email/QR Code

### 3.5. Implementação de Contingência

1. **Detecção automática de indisponibilidade**:
   - [ ] Monitoramento do status dos serviços da SEFAZ
   - [ ] Alternância automática para contingência quando necessário

2. **Modos de contingência**:
   - [ ] SVC-AN/SVC-RS para NF-e
   - [ ] Offline para NFC-e
   - [ ] Armazenamento local e transmissão posterior

### 3.6. Testes e Homologação

1. **Ambientes de teste**:
   - [ ] Configuração do ambiente de homologação
   - [ ] Testes de emissão e cancelamento
   - [ ] Validação de todos os cenários fiscais relevantes

2. **Transição para produção**:
   - [ ] Procedimento seguro para migração para o ambiente de produção
   - [ ] Validação de primeiras notas em produção

## 4. Detalhes Técnicos Essenciais

### 4.1. Composição da Chave de Acesso (44 dígitos)

| Posição | Tamanho | Conteúdo | Descrição |
|---------|---------|----------|------------|
| 1-2     | 2       | cUF      | Código da UF (da tabela companies) |
| 3-4     | 2       | AAMM     | Ano e mês da emissão |
| 5-18    | 14      | CNPJ     | CNPJ do emitente (da tabela companies) |
| 19-20   | 2       | mod      | Modelo (55 para NF-e, 65 para NFC-e) |
| 21-22   | 2       | série    | Série do documento (da configuração) |
| 23-30   | 8       | nNF      | Número do documento (da configuração) |
| 31-31   | 1       | tpEmis   | Tipo emissão (definido na hora) |
| 32-39   | 8       | cNF      | Código aleatório (gerado na hora) |
| 40-40   | 1       | cDV      | Dígito verificador (calculado) |

### 4.2. Funções Utilitárias a Implementar

```typescript
// Função para gerar chave de acesso
export const gerarChaveAcesso = (
  ufCodigo: string,
  dataEmissao: Date,
  cnpjEmitente: string,
  modelo: string,
  serie: string,
  numeroNF: string,
  tipoEmissao: string
): string => {
  // Formatar os valores conforme necessário
  const aamm = dataEmissao.toISOString().slice(2, 4) + dataEmissao.toISOString().slice(5, 7);
  const nNF = numeroNF.padStart(8, '0');
  const cNF = gerarCodigoNumerico();
  
  // Criar a chave sem o DV
  const chaveBase = 
    ufCodigo.padStart(2, '0') + 
    aamm + 
    cnpjEmitente.replace(/\D/g, '') + 
    modelo.padStart(2, '0') + 
    serie.padStart(2, '0') + 
    nNF + 
    tipoEmissao + 
    cNF;
  
  // Calcular o DV e adicionar à chave
  const dv = calcularDigitoVerificador(chaveBase);
  return chaveBase + dv;
};

// Função para validar XML contra schemas XSD
export const validarXml = (xml: string, schemaPath: string): boolean => {
  // Validação do XML contra o schema
};

// Função para assinar XML com certificado digital
export const assinarXml = (
  xml: string, 
  certificadoArquivo: string,
  certificadoSenha: string
): string => {
  // Implementação da assinatura digital
};
```

### 4.3. Fluxo de Emissão NF-e/NFC-e

1. **Montagem do XML**:
   - Construir XML baseado nas configurações e dados da venda
   - Validar o XML contra o schema oficial

2. **Assinatura Digital**:
   - Assinar o XML com o certificado digital configurado

3. **Transmissão para SEFAZ**:
   - Enviar via Web Service usando NFeAutorizacao
   - Receber o recibo de processamento

4. **Consulta de Processamento**:
   - Consultar o status do processamento via NFeRetAutorizacao
   - Armazenar o protocolo de autorização

5. **Geração do DANFE/DANFE-NFC-e**:
   - Gerar a representação gráfica conforme layout oficial
   - Imprimir ou disponibilizar em formato digital

6. **Tratamento de Contingência**:
   - Monitorar falhas de comunicação
   - Alternar para modo de contingência quando necessário
   - Reprocessar notas pendentes quando serviço for restaurado

## 5. Ordem de Implementação Recomendada

1. **Fase 1: Configuração Base e Integração sped-nfe**
   - [x] Configurações do sistema e certificado
   - [ ] Preparar ambiente PHP para a biblioteca sped-nfe
   - [ ] Desenvolver API de integração entre o frontend React e o serviço PHP
   - [ ] Implementar métodos básicos de comunicação (status, consultas)

2. **Fase 2: Cadastros e Serviços Básicos**
   - [x] Cadastro de produtos (parcial)
   - [ ] Complemento do cadastro de produtos com informações fiscais (NCM, CFOP, CST)
   - [ ] Cadastro de clientes/destinatários
   - [ ] Implementação dos métodos da classe `Make` para construção de XML

3. **Fase 3: Emissão de NF-e (Modelo 55)**
   - [ ] Interface de emissão
   - [ ] Integração com sped-nfe para geração, assinatura e transmissão
   - [ ] Geração de DANFE via biblioteca (ou alternativa JS)
   - [ ] Implementação de eventos (cancelamento, carta de correção)

4. **Fase 4: Emissão de NFC-e (Modelo 65)**
   - [ ] Interface PDV integrada
   - [ ] Geração de QR Code via sped-nfe
   - [ ] Impressão de DANFE-NFC-e
   - [ ] Otimizações para emissão rápida em ambiente PDV

5. **Fase 5: Contingência e Robustez**
   - [ ] Implementação dos modos de contingência suportados pela biblioteca
   - [ ] Sistema de fila e reprocessamento automático
   - [ ] Dashboard de monitoramento de emissões e falhas
   - [ ] Auditoria e logs fiscais completos

## 6. Implementando com a Biblioteca sped-nfe

### 6.1. Estrutura Básica de Implementação

A implementação seguirá o seguinte padrão usando a biblioteca:

```php
// Configuração básica
$config = [  
    "atualizacao" => "2023-01-01 09:00:00",
    "tpAmb" => 2, // 1-Produção ou 2-Homologação
    "razaosocial" => "Empresa LTDA",
    "cnpj" => "99999999999999",
    "ie" => "9999999999",
    "siglaUF" => "SP",
    "schemes" => "PL_009_V4",
    "versao" => "4.00"
];
$configJson = json_encode($config);

// Carregando certificado
$cert = file_get_contents('certificado.pfx');

// Inicializando a classe Tools com as configurações e certificado
$tools = new \NFePHP\NFe\Tools($configJson, $cert, 'senha-certificado');
$tools->model('55'); // 55 para NFe ou 65 para NFCe

// Verificando status do serviço
$status = $tools->sefazStatus();

// Criando XML da NFe
$nfe = new \NFePHP\NFe\Make();

// Construindo o XML conforme documentação Make.md
// Dados da nota...

// Assinando e enviando
$xmlAssinado = $tools->signNFe($nfe->getXML());
$idLote = str_pad(100, 15, '0', STR_PAD_LEFT);
$resp = $tools->sefazEnviaLote([$xmlAssinado], $idLote);

// Consultando recibo e obtendo protocolo de autorização
$st = new \NFePHP\NFe\Common\Standardize();
$std = $st->toStd($resp);
$recibo = $std->infRec->nRec;
$protocolo = $tools->sefazConsultaRecibo($recibo);
```

### 6.2. Principais Componentes da Biblioteca

1. **Tools** - Responsável pela comunicação com a SEFAZ, assinatura e operações principais
2. **Make** - Utilizada para construir o XML conforme schemas oficiais
3. **Complements** - Adiciona protocolos e informações complementares ao XML
4. **Danfe** - Gera a representação visual da nota fiscal
5. **Standardize** - Converte respostas XML em objetos PHP ou JSON

### 6.3. Componentes a Desenvolver

1. **API REST em PHP** - Interface entre nosso frontend React e a biblioteca sped-nfe:
   - Endpoints seguros para receber dados do frontend
   - Lógica de conversão de dados para o formato adequado à biblioteca
   - Manipulação de respostas e erros
   - Armazenamento seguro do certificado digital

2. **Camada de Integração no Frontend**:
   - Serviços para comunicação com a API PHP
   - Estado global para informações fiscais
   - Componentes de UI específicos para operações fiscais
