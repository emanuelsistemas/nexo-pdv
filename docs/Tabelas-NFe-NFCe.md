# Documentação das Tabelas para NF-e/NFC-e

Este documento contém a descrição detalhada de todas as tabelas e campos relacionados à emissão de NF-e (Nota Fiscal Eletrônica, modelo 55) e NFC-e (Nota Fiscal de Consumidor Eletrônica, modelo 65) no Nexo PDV.

## Índice

1. [Tabelas de Configuração](#tabelas-de-configuração)
   - [nfe_configuracoes](#nfe_configuracoes)
   - [nfce_configuracoes](#nfce_configuracoes)

2. [Tabelas Principais](#tabelas-principais)
   - [nfe](#nfe)
   - [nfe_destinatario](#nfe_destinatario)
   - [nfe_itens](#nfe_itens)
   - [nfe_transporte](#nfe_transporte)
   - [nfe_volumes](#nfe_volumes)
   - [nfe_pagamentos](#nfe_pagamentos)

3. [Tabelas Auxiliares](#tabelas-auxiliares)
   - [nfe_referencias](#nfe_referencias)
   - [nfe_observacoes](#nfe_observacoes)
   - [nfe_duplicatas](#nfe_duplicatas)
   - [nfe_responsavel_tecnico](#nfe_responsavel_tecnico)

4. [Tabelas de Controle e Auditoria](#tabelas-de-controle-e-auditoria)
   - [nfe_logs](#nfe_logs)
   - [nfe_contingencia](#nfe_contingencia)
   - [nfe_contingencia_notas](#nfe_contingencia_notas)

5. [Relacionamentos entre Tabelas](#relacionamentos-entre-tabelas)

---

## Tabelas de Configuração

### nfe_configuracoes

Armazena as configurações relacionadas à emissão de NF-e (modelo 55).

| Campo | Tipo | Descrição | Referência na NF-e |
|-------|------|-----------|-------------------|
| id | uuid | Identificador único da configuração | - |
| company_id | uuid | Referência para a empresa | Emissor |
| ambiente | character | Ambiente de emissão ('1' para produção, '2' para homologação) | tpAmb |
| versao | character varying | Versão do layout da NF-e (ex: '4.00') | versao |
| modelo_nfe | character varying | Modelo do documento fiscal ('55' para NF-e) | mod |
| serie | integer | Série do documento fiscal | serie |
| numero_atual | integer | Número atual da NF-e (último emitido) | nNF |
| certificado_arquivo | text | Nome do arquivo do certificado digital | - |
| certificado_senha | character varying | Senha do certificado digital (criptografada) | - |
| certificado_validade | date | Data de validade do certificado | - |
| logo_url | character varying | URL do logotipo para impressão no DANFE | - |
| created_at | timestamptz | Data/hora de criação do registro | - |
| updated_at | timestamptz | Data/hora da última atualização | - |

### nfce_configuracoes

Armazena as configurações relacionadas à emissão de NFC-e (modelo 65).

| Campo | Tipo | Descrição | Referência na NFC-e |
|-------|------|-----------|-------------------|
| id | uuid | Identificador único da configuração | - |
| company_id | uuid | Referência para a empresa | Emissor |
| ambiente | character | Ambiente de emissão ('1' para produção, '2' para homologação) | tpAmb |
| versao | character varying | Versão do layout da NFC-e (ex: '4.00') | versao |
| modelo_nfce | character varying | Modelo do documento fiscal ('65' para NFC-e) | mod |
| serie | integer | Série do documento fiscal | serie |
| numero_atual | integer | Número atual da NFC-e (último emitido) | nNF |
| certificado_arquivo | text | Nome do arquivo do certificado digital | - |
| certificado_senha | character varying | Senha do certificado digital (criptografada) | - |
| certificado_validade | date | Data de validade do certificado | - |
| csc_id | character varying | Identificador do CSC (Código de Segurança do Contribuinte) | idCSC |
| csc_token | character varying | Token do CSC para geração do QR Code | CSC |
| logo_url | character varying | URL do logotipo para impressão no DANFE-NFC-e | - |
| created_at | timestamptz | Data/hora de criação do registro | - |
| updated_at | timestamptz | Data/hora da última atualização | - |

---

## Tabelas Principais

### nfe

Tabela principal que armazena os dados das notas fiscais emitidas (NF-e e NFC-e).

| Campo | Tipo | Descrição | Referência no XML |
|-------|------|-----------|-------------------|
| id | uuid | Identificador único da nota fiscal | - |
| company_id | uuid | Referência para a empresa emitente | - |
| numero | integer | Número sequencial da nota fiscal | nNF |
| serie | integer | Série da nota fiscal | serie |
| modelo | character varying | Modelo do documento (55=NF-e, 65=NFC-e) | mod |
| chave_acesso | character varying | Chave de acesso (44 dígitos) | Id da NF-e |
| data_emissao | timestamptz | Data e hora de emissão da NF | dhEmi |
| data_saida_entrada | timestamptz | Data e hora de saída/entrada | dhSaiEnt |
| tipo_operacao | character | Tipo da operação (1=Saída, 0=Entrada) | tpNF |
| natureza_operacao | character varying | Natureza da operação (venda, devolução, etc.) | natOp |
| finalidade | character | Finalidade da emissão (1=Normal, 2=Complementar, etc.) | finNFe |
| forma_pagamento | character | Forma de pagamento (0=À vista, 1=A prazo, 2=Outros) | indPag |
| tipo_emissao | character | Tipo de emissão (1=Normal, 9=Contingência, etc.) | tpEmis |
| presenca_comprador | character | Indicador de presença do comprador | indPres |
| digest_value | character varying | DigestValue da assinatura digital | DigestValue |
| status | character varying | Status da nota (RASCUNHO, ENVIADA, AUTORIZADA, etc.) | - |
| protocolo | character varying | Número do protocolo de autorização | nProt |
| xml_enviado | text | XML enviado para a SEFAZ | - |
| xml_retorno | text | XML de retorno da SEFAZ | - |
| xml_protocolo | text | XML do protocolo de autorização | - |
| qrcode_url | text | URL do QR Code (para NFC-e) | urlChave |
| qrcode_dados | text | Dados do QR Code (para NFC-e) | qrCode |
| url_consulta | character varying | URL para consulta pública da nota | - |
| motivo_cancelamento | text | Motivo do cancelamento, se cancelada | - |
| created_at | timestamptz | Data/hora de criação do registro | - |
| updated_at | timestamptz | Data/hora da última atualização | - |
| created_by | uuid | ID do usuário que criou a nota | - |

### nfe_destinatario

Armazena os dados do destinatário da nota fiscal.

| Campo | Tipo | Descrição | Referência no XML |
|-------|------|-----------|-------------------|
| id | uuid | Identificador único do registro | - |
| nfe_id | uuid | Referência para a nota fiscal | - |
| tipo_documento | character | Tipo do documento (1=CPF, 2=CNPJ) | - |
| documento | character varying | Número do CPF/CNPJ do destinatário | CPF/CNPJ |
| nome | character varying | Nome/Razão Social do destinatário | xNome |
| ie | character varying | Inscrição Estadual | IE |
| email | character varying | Email do destinatário | email |
| telefone | character varying | Telefone do destinatário | fone |
| endereco_logradouro | character varying | Logradouro (rua, avenida, etc.) | xLgr |
| endereco_numero | character varying | Número do endereço | nro |
| endereco_complemento | character varying | Complemento do endereço | xCpl |
| endereco_bairro | character varying | Bairro | xBairro |
| endereco_cep | character varying | CEP | CEP |
| endereco_municipio | character varying | Nome do município | xMun |
| endereco_municipio_codigo | character varying | Código IBGE do município | cMun |
| endereco_uf | character | Sigla da UF | UF |
| endereco_pais | character varying | Nome do país | xPais |
| endereco_pais_codigo | character varying | Código do país (1058=Brasil) | cPais |
| created_at | timestamptz | Data/hora de criação do registro | - |

### nfe_itens

Armazena os itens (produtos/serviços) da nota fiscal.

| Campo | Tipo | Descrição | Referência no XML |
|-------|------|-----------|-------------------|
| id | uuid | Identificador único do item | - |
| nfe_id | uuid | Referência para a nota fiscal | - |
| product_id | uuid | Referência para o produto no sistema | - |
| numero_item | integer | Número sequencial do item na nota | nItem |
| codigo | character varying | Código do produto | cProd |
| descricao | character varying | Descrição do produto/serviço | xProd |
| ncm | character varying | Código NCM | NCM |
| cest | character varying | Código Especificador da Substituição Tributária | CEST |
| cfop | character varying | Código Fiscal de Operações e Prestações | CFOP |
| unidade | character varying | Unidade comercial | uCom |
| quantidade | numeric | Quantidade comercial | qCom |
| valor_unitario | numeric | Valor unitário de comercialização | vUnCom |
| valor_total | numeric | Valor total bruto | vProd |
| valor_desconto | numeric | Valor do desconto | vDesc |
| ean | character varying | Código de barras do produto (GTIN/EAN) | cEAN |
| ean_tributavel | character varying | Código de barras tributável | cEANTrib |
| cst_icms | character varying | Código de Situação Tributária do ICMS | CST |
| csosn | character varying | Código de Situação da Operação - Simples Nacional | CSOSN |
| base_calculo_icms | numeric | Base de cálculo do ICMS | vBC |
| aliquota_icms | numeric | Alíquota do ICMS | pICMS |
| valor_icms | numeric | Valor do ICMS | vICMS |
| fcp_percentual | numeric | Percentual do Fundo de Combate à Pobreza | pFCP |
| fcp_base_calculo | numeric | Base de cálculo do FCP | vBCFCP |
| fcp_valor | numeric | Valor do FCP | vFCP |
| cst_ipi | character varying | Código de Situação Tributária do IPI | CST (IPI) |
| base_calculo_ipi | numeric | Base de cálculo do IPI | vBC (IPI) |
| aliquota_ipi | numeric | Alíquota do IPI | pIPI |
| valor_ipi | numeric | Valor do IPI | vIPI |
| cst_pis | character varying | Código de Situação Tributária do PIS | CST (PIS) |
| base_calculo_pis | numeric | Base de cálculo do PIS | vBC (PIS) |
| aliquota_pis | numeric | Alíquota do PIS | pPIS |
| valor_pis | numeric | Valor do PIS | vPIS |
| cst_cofins | character varying | Código de Situação Tributária do COFINS | CST (COFINS) |
| base_calculo_cofins | numeric | Base de cálculo do COFINS | vBC (COFINS) |
| aliquota_cofins | numeric | Alíquota do COFINS | pCOFINS |
| valor_cofins | numeric | Valor do COFINS | vCOFINS |
| created_at | timestamptz | Data/hora de criação do registro | - |

### nfe_transporte

Armazena informações sobre o transporte das mercadorias.

| Campo | Tipo | Descrição | Referência no XML |
|-------|------|-----------|-------------------|
| id | uuid | Identificador único do registro | - |
| nfe_id | uuid | Referência para a nota fiscal | - |
| modalidade_frete | character | Modalidade do frete (0=Emitente, 1=Destinatário, etc.) | modFrete |
| transportadora_documento | character varying | CNPJ/CPF da transportadora | CNPJ/CPF |
| transportadora_nome | character varying | Nome/Razão Social da transportadora | xNome |
| transportadora_ie | character varying | Inscrição Estadual da transportadora | IE |
| transportadora_endereco | character varying | Endereço completo da transportadora | xEnder |
| transportadora_municipio | character varying | Nome do município da transportadora | xMun |
| transportadora_uf | character | Sigla da UF da transportadora | UF |
| veiculo_placa | character varying | Placa do veículo | placa |
| veiculo_uf | character | UF do veículo | UF |
| veiculo_rntc | character varying | Registro Nacional de Transportador de Carga | RNTC |
| created_at | timestamptz | Data/hora de criação do registro | - |

### nfe_volumes

Armazena informações sobre os volumes transportados.

| Campo | Tipo | Descrição | Referência no XML |
|-------|------|-----------|-------------------|
| id | uuid | Identificador único do volume | - |
| nfe_transporte_id | uuid | Referência para o transporte | - |
| quantidade | integer | Quantidade de volumes | qVol |
| especie | character varying | Espécie dos volumes | esp |
| marca | character varying | Marca dos volumes | marca |
| numeracao | character varying | Numeração dos volumes | nVol |
| peso_liquido | numeric | Peso líquido (kg) | pesoL |
| peso_bruto | numeric | Peso bruto (kg) | pesoB |
| created_at | timestamptz | Data/hora de criação do registro | - |

### nfe_pagamentos

Armazena informações sobre os pagamentos da nota fiscal.

| Campo | Tipo | Descrição | Referência no XML |
|-------|------|-----------|-------------------|
| id | uuid | Identificador único do pagamento | - |
| nfe_id | uuid | Referência para a nota fiscal | - |
| forma_pagamento | character varying | Forma de pagamento (01=Dinheiro, 03=Cartão Crédito, etc.) | tPag |
| valor | numeric | Valor do pagamento | vPag |
| created_at | timestamptz | Data/hora de criação do registro | - |

---

## Tabelas Auxiliares

### nfe_referencias

Armazena referências a outras notas fiscais, utilizada em casos de devolução, complemento, etc.

| Campo | Tipo | Descrição | Referência no XML |
|-------|------|-----------|-------------------|
| id | uuid | Identificador único da referência | - |
| nfe_id | uuid | Referência para a nota fiscal atual | - |
| tipo_referencia | character varying | Tipo da referência (NFe, NFCe, CTe, ECF, etc.) | - |
| chave_acesso | character varying | Chave de acesso da nota referenciada | refNFe |
| numero_nota | character varying | Número da nota referenciada (quando não for eletrônica) | nNF |
| serie | character varying | Série da nota referenciada | serie |
| data_emissao | date | Data de emissão da nota referenciada | dEmi |
| cnpj_cpf_emitente | character varying | CNPJ/CPF do emitente da nota referenciada | CNPJ/CPF |
| modelo | character varying | Modelo do documento referenciado | mod |
| created_at | timestamptz | Data/hora de criação do registro | - |

### nfe_observacoes

Armazena observações fiscais e do contribuinte.

| Campo | Tipo | Descrição | Referência no XML |
|-------|------|-----------|-------------------|
| id | uuid | Identificador único da observação | - |
| nfe_id | uuid | Referência para a nota fiscal | - |
| tipo | character varying | Tipo (FISCO ou CONTRIBUINTE) | - |
| campo | character varying | Campo de interesse do fisco (quando aplicável) | xCampo |
| texto | text | Texto da observação | xTexto |
| created_at | timestamptz | Data/hora de criação do registro | - |

### nfe_duplicatas

Armazena informações sobre duplicatas em vendas a prazo.

| Campo | Tipo | Descrição | Referência no XML |
|-------|------|-----------|-------------------|
| id | uuid | Identificador único da duplicata | - |
| nfe_id | uuid | Referência para a nota fiscal | - |
| numero | character varying | Número da duplicata | nDup |
| vencimento | date | Data de vencimento | dVenc |
| valor | numeric | Valor da duplicata | vDup |
| created_at | timestamptz | Data/hora de criação do registro | - |

### nfe_responsavel_tecnico

Armazena informações sobre o responsável técnico pela emissão da NF-e/NFC-e.

| Campo | Tipo | Descrição | Referência no XML |
|-------|------|-----------|-------------------|
| id | uuid | Identificador único do registro | - |
| nfe_id | uuid | Referência para a nota fiscal | - |
| cnpj | character varying | CNPJ da pessoa jurídica responsável | CNPJ |
| contato | character varying | Nome da pessoa a ser contatada | xContato |
| email | character varying | Email da pessoa a ser contatada | email |
| telefone | character varying | Telefone da pessoa a ser contatada | fone |
| csrt | character varying | Código de Segurança do Responsável Técnico | CSRT |
| id_csrt | character varying | Identificador do CSRT | idCSRT |
| created_at | timestamptz | Data/hora de criação do registro | - |

---

## Tabelas de Controle e Auditoria

### nfe_logs

Armazena logs detalhados de operações e erros.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador único do log |
| company_id | uuid | Referência para a empresa |
| nfe_id | uuid | Referência para a nota fiscal (se aplicável) |
| data_hora | timestamptz | Data e hora do evento |
| tipo | character varying | Tipo do log (INFO, ERRO, ALERTA, etc.) |
| operacao | character varying | Operação realizada (EMISSAO, CANCELAMENTO, etc.) |
| mensagem | text | Mensagem descritiva do log |
| detalhes | jsonb | Detalhes adicionais em formato JSON |
| ip_origem | character varying | Endereço IP de origem da operação |
| usuario_id | uuid | ID do usuário que realizou a operação |
| usuario_nome | character varying | Nome do usuário que realizou a operação |

### nfe_contingencia

Armazena informações sobre períodos de contingência.

| Campo | Tipo | Descrição | Referência no XML |
|-------|------|-----------|-------------------|
| id | uuid | Identificador único do registro | - |
| company_id | uuid | Referência para a empresa | - |
| tipo_contingencia | character varying | Tipo de contingência (SVCAN, SVCRS, EPEC, FS-DA, FS) | tpEmis |
| motivo | text | Motivo da entrada em contingência | - |
| data_inicio | timestamptz | Data/hora de início da contingência | dhCont |
| data_fim | timestamptz | Data/hora de fim da contingência | - |
| justificativa | text | Justificativa para entrada em contingência | xJust |
| usuario_id | uuid | ID do usuário que ativou a contingência | - |
| status | character varying | Status (ATIVA, ENCERRADA) | - |
| created_at | timestamptz | Data/hora de criação do registro | - |
| updated_at | timestamptz | Data/hora da última atualização | - |

### nfe_contingencia_notas

Associa notas fiscais emitidas em contingência com o período de contingência.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador único do registro |
| contingencia_id | uuid | Referência para o período de contingência |
| nfe_id | uuid | Referência para a nota fiscal |
| data_emissao_contingencia | timestamptz | Data/hora da emissão em contingência |
| data_transmissao_normal | timestamptz | Data/hora da transmissão normal após contingência |
| status | character varying | Status (PENDENTE, TRANSMITIDA, REJEITADA) |
| created_at | timestamptz | Data/hora de criação do registro |
| updated_at | timestamptz | Data/hora da última atualização |

---

## Relacionamentos entre Tabelas

```
companies
  ↓
  ├── nfe_configuracoes
  ├── nfce_configuracoes
  ├── nfe
  │     ↓
  │     ├── nfe_destinatario
  │     ├── nfe_itens
  │     ├── nfe_transporte
  │     │     ↓
  │     │     └── nfe_volumes
  │     ├── nfe_pagamentos
  │     ├── nfe_referencias
  │     ├── nfe_observacoes
  │     ├── nfe_duplicatas
  │     └── nfe_responsavel_tecnico
  ├── nfe_logs
  ├── nfe_contingencia
  │     ↓
  │     └── nfe_contingencia_notas
  │           ↓
  │           └── nfe (referência à tabela principal)
  └── products
        ↓
        └── nfe_itens (via product_id)
```

Este diagrama mostra como as tabelas estão relacionadas entre si, facilitando a compreensão da estrutura do banco de dados para a emissão de NF-e e NFC-e.

---

## Notas Importantes

1. **Modelos Compartilhados**: As mesmas tabelas são utilizadas tanto para NF-e (modelo 55) quanto para NFC-e (modelo 65), sendo diferenciadas pelo campo `modelo` na tabela `nfe`.

2. **Campos Obrigatórios**: Nem todos os campos são obrigatórios em todas as situações. A obrigatoriedade depende do tipo de operação, do modelo do documento e do regime tributário do emitente.

3. **Expansibilidade**: A estrutura foi projetada para ser facilmente expandida conforme novas exigências da SEFAZ e atualizações nas Notas Técnicas.

4. **Contingência**: As tabelas de contingência permitem o controle e rastreamento de documentos emitidos durante períodos de indisponibilidade dos serviços da SEFAZ.

5. **Auditoria**: As tabelas de logs garantem a rastreabilidade completa das operações, essencial para processos de auditoria fiscal.
