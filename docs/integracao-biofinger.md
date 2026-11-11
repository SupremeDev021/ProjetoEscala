# Preparação Biofinger / Hikvision

Esta entrega não implementa uma conexão real. Não foram fornecidos documentação oficial, backend ou credenciais de servidor. O estado é sempre **Aguardando configuração da integração** e a última sincronização real é **Nunca realizada**. Habilitar o formulário apenas registra a intenção de configuração. Não há solicitação de rede para o endereço informado, nem acesso direto a equipamentos pelo navegador.

A rota administrativa `/integracao-ponto-facial` pertence ao layout com seleção de perfil. Gestores operam somente a unidade ativa autorizada; o administrador geral utiliza o seletor existente. Esses controles continuam demonstrativos: o usuário pode alterar o estado local. Dados reais exigem autenticação e autorização no servidor.

## Separação de responsabilidades

- `src/integration/configuration.ts`: configuração por unidade e validação por lista de campos permitidos. URL documentada somente HTTPS, sem credenciais, query ou fragmento. Intervalo de 30–3600 segundos. Regras independentes diurno/noturno; viradas 07h/19h fixas.
- `src/integration/mappings.ts`: associação explícita e única de ID interno ao ID externo por unidade, com vínculo ativo. Identificadores permanecem texto (inclusive zeros à esquerda). Não admite identificadores nacionais no formato de 11/15 dígitos. Nomes não estabelecem relações.
- `src/integration/biofingerAdapter.ts`: contrato interno da aplicação, sem pretender representar o protocolo ou o formato oficial do fornecedor. Somente um adaptador futuro no servidor poderá traduzir eventos documentados para esse contrato.
- `src/integration/queryService.ts`: consulta e normalização; aceita somente relação única de IDs, unidade externa correspondente, equipamento cadastrado e pessoa escalada. Sem adaptador retorna vazio. Falha não cria uma sincronização. Uma simulação atualiza apenas `lastSimulation`, nunca `lastSynchronization`.
- `src/integration/simulatedAdapter.ts`: adaptador em memória para desenvolvimento e testes.
- `src/services/pontoFacialService.ts`: regras de entrada confirmada/recebida e janela de plantão; serviço fictício de desenvolvimento existente preservado. O dashboard passa a simulação por uma relação explícita de IDs sintéticos antes de aplicar as regras.
- `src/services/workRegimes.ts`: janelas de 12h, 24h e 8h. Não armazena presença real, biometria ou imagens.

O objeto de configuração tem `unitId`, `enabled`, provedor Biofinger, fabricante Hikvision, `externalUnitId`, `equipmentIds`, `documentedServiceUrl`, `credentialReference`, `pollSeconds` e regras por turno. Não contém senha, token, chave, status conectado nem data de sincronização editável. `credentialReference` aceita apenas um alias no formato `server:biofinger-cer-barra`; o segredo correspondente precisará existir em um gerenciador seguro no servidor. Nunca cole o valor da credencial em nenhum campo.

A configuração e os mapeamentos fictícios ficam no estado local existente. O salvamento descarta campos extras (inclusive um segredo ou timestamp indevidamente adicionado). As alterações geram auditoria local. Nenhum segredo deve entrar no cliente, repositório, bundle, arquivos `.env` públicos ou `localStorage`. O frontend não testa o endereço informado.

## Confirmação e dashboard

O LED verde depende de pessoa publicada, relação única de IDs, unidade, equipamento, entrada recebida e confirmada, identificador do plantão e janela temporal válidos. Registros futuros, antigos, de saída, rejeitados, pendentes, não recebidos ou de outra unidade não confirmam ponto. Ausência de registro ou indisponibilidade mantém a aparência padrão; não produz classificação de falta nem borda vermelha.

O noturno de 19h–07h mantém a data de início após meia-noite. O estado é consultado no intervalo configurado (30 segundos por padrão), sem recarregar a página e com descarte de respostas de contextos anteriores. A demonstração de ponto precisa ser ativada explicitamente no painel de desenvolvimento fora do modo TV. Ela usa IDs fictícios e nunca representa uma sincronização real. Na produção não existe ativação de simulação nem adaptador de rede.

No dashboard público só há nomes e cargos: sem especialidade, identificadores internos/externos, CPF, CNS, imagens ou horários individuais de marcação. O LED é um estado visual de confirmação, sem indicação de ausência. Logo original, fundo branco, negrito, carrossel por função, avanço automático, modo TV, controles discretos, fullscreen e inicializador de quiosque permanecem.

## Jornadas

- **12×36**: seleciona diurno 07h–19h ou noturno 19h–07h. A opção descreve a jornada; não gera recorrência automática nem valida descanso trabalhista em outros dias.
- **24 horas**: início 07h e término 07h do dia seguinte; a publicação atômica gera os segmentos diurno e noturno da mesma data, equipe e cargos. Eles compartilham `publicationId`, preservando a chave lógica existente em cada segmento. O Histórico copia os segmentos juntos. Uma entrada válida da jornada pode manter o LED durante a madrugada; a confirmação expira no término.
- **Diarista (8 horas)**: início configurável entre 07h e 11h, padrão 08h; duração exata de 8h dentro do diurno. A lista pública só inclui essa composição dentro da janela, encerrando-a automaticamente. O início aparece no resumo antes da publicação.

Registros antigos sem jornada explícita continuam com as janelas originais de 12h. Nenhuma migração reescreve escalas publicadas. As jornadas não são adicionadas à chave lógica: alterar uma combinação existente substitui somente essa combinação. Publicações de 24h substituem os dois segmentos juntos após todas as validações.

## Catálogo CBO e importação

`src/imports/cbo.ts` contém os 50 códigos fornecidos, todos como texto. Vários CBOs reutilizam o mesmo cargo; Roupeiro/Rouparia e Médico/Pediatra/Psiquiatra continuam distintos. `ensureRoleCatalog` adiciona somente cargos ausentes por nome normalizado, preservando IDs existentes, cargos inativos, profissionais, vínculos e escalas. Especialidade é apenas um campo legado preservado no armazenamento; não aparece no cadastro, nas listas, no histórico renderizado ou no dashboard.

Não foi disponibilizada a planilha nominal do CER BARRA nesta solicitação. Não houve análise nem importação de uma listagem real. O importador foi preparado e testado exclusivamente com dados fictícios.

O importador aceita CSV/TSV textual com NOME e CBO e CARGO opcional; colunas extras (incluindo CPF, CNS e EQUIPE) são descartadas. Não usa nem guarda CPF/CNS para deduplicar. O código ignorado 221105 aparece apenas na contagem, sem nome na prévia. Aspas, delimitadores, códigos desconhecidos, homônimos, linhas repetidas, divergências de cargo e formato ambíguo são tratados na prévia. Códigos desconhecidos e linhas malformadas precisam ser corrigidos na origem ou permanecer pendentes; marcar revisão não inventa um cargo.

Possíveis correspondências nunca são associadas por nome automaticamente: o operador precisa conferir a identidade por um processo autorizado externo e decidir explicitamente entre associar um ID existente, criar pessoa distinta ou deixar pendente. Correspondências fora da unidade são encaminhadas ao administrador, sem revelar os IDs ao gestor e sem permitir criação silenciosa de duplicatas. Uma associação exige cargo compatível e pessoa ativa; não altera nome/cargo do cadastro existente. Linhas já processadas do mesmo lote são bloqueadas. Em outro lote, nomes coincidentes voltam para revisão; não há deduplicação segura universal sem um identificador apropriado documentado.

A gravação confirma contagens de criados, associados/vinculados, ignorados e pendentes, valida numa cópia isolada e não altera modelos, equipes, escalas, publicações ou cadastros anteriores. Linhas ignoradas não são persistidas. A versão pública oferece apenas uma amostra fictícia fixa, sem upload ou edição de arquivo. A área de desenvolvimento permite testar texto fictício, mas não deve receber a listagem real. Nenhuma lista real integra seed, fixtures ou bundle.

## Informações necessárias para conectar de verdade

1. Documentação oficial e versão do Biofinger instalado, edição/módulos licenciados e suporte autorizado à integração; modelos, firmware e identificadores dos equipamentos Hikvision. Não presumir compatibilidade pelo fabricante.
2. Arquitetura suportada: integração via Biofinger ou outra interface formalmente aprovada; ambientes de homologação/produção, URL HTTPS, conectividade e requisitos de rede/TLS do servidor. Não conectar leitores pelo browser.
3. Método oficial de autenticação, emissão/renovação/revogação, permissões mínimas, limites e armazenamento seguro de credenciais. O valor deve ser inserido no servidor, nunca nesta interface.
4. Contrato oficial de consulta/eventos: campos, tipos, IDs estáveis e únicos de pessoa/unidade/equipamento/evento, direção entrada/saída, significado de recebido/confirmado/rejeitado e exemplos anonimizados. Precisamos de uma relação verificável entre IDs profissionais, sem nome, CPF ou CNS como chave pública.
5. Fuso, precisão, sincronismo de relógio e semântica dos timestamps; regras de tolerância aprovadas para 12×36, 24h e diarista. Se o fornecedor não identificar plantões, o servidor deverá atribuí-los pelas janelas aprovadas.
6. Paginação, cursores, histórico disponível, reprocessamento, idempotência, eventos atrasados/corrigidos, rate limits, timeouts, retries/backoff e comportamento em indisponibilidade. Só implementar webhook se estiver oficialmente documentado, com validação de autenticidade.
7. Backend autenticado com autorização por unidade, banco e auditoria durável, configuração/mapeamentos protegidos, exclusão de biometria e minimização. Uma projeção pública poderá fornecer somente as confirmações necessárias ao plantão, sem identificadores ou horários individuais na apresentação.
8. Homologação com registros fictícios/anonimizados e validação conjunta dos responsáveis antes de habilitar operação real. Registrar última sincronização somente após comunicação validada pelo servidor.

## Validação desta entrega

31 testes automatizados passaram, incluindo as regressões existentes. O build TypeScript/Vite e o build com base `/ProjetoEscala/` passaram. Chromium verificou configuração/mapeamento com zeros à esquerda, isolamento entre unidades, retirada de especialidade, prévia e gravação fictícia, publicação pareada de 24h, controles de diarista, modo móvel e LED atualizado após consulta sem reload. A versão compilada para Pages foi testada com rotas em hash, sem entrada de arquivo real, sem simulação de ponto na produção, sem chamadas externas e sem os marcadores privados de teste no bundle. Não houve teste de conexão real por ausência de backend e documentação oficial.
