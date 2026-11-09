# Rio Saúde | Protótipo de Escalas

MVP navegável para demonstrar a montagem de escalas de profissionais de saúde. Identidade visual ilustrativa, sem logotipos oficiais e sem vínculo com um portal oficial. **Todos os profissionais, usuários e registros são fictícios**; os nomes de unidades seguem o roteiro de demonstração fornecido.

**Simulação de acesso - sem autenticação real**

**Acesso demonstrativo, não adequado a dados reais**

## Executar

Requer Node.js 22 ou superior e npm.

```sh
npm install
npm run dev
```

Para uma instalação reproduzível com o lockfile: `npm ci`. O servidor de desenvolvimento utiliza a porta 5173 por padrão.

```sh
npm run build       # TypeScript e bundle de produção
npm test            # 11 testes de domínio e dashboard
npm run preview     # servir o build localmente
```

## Experiência

- `/`: entrada simulada como administrador geral ou gestor de CER BARRA.
- `/escala`: edição manual por unidade, data, turno, equipe e cargo; busca, seleção, equipe padrão, rascunho, publicação confirmada, consulta e duplicação para outra data.
- `/cadastros`: criar, editar, desativar e reativar profissionais, com vínculos por unidade separados do cadastro.
- `/equipes`: criar e editar modelos fixos por cargo, com turno opcional.
- `/historico`: eventos locais com antes/depois; administrador vê e filtra todas as unidades.
- `/administracao`: unidades e associações de acesso fictícias, restritas ao perfil global na simulação.
- `/dashboard`: layout independente para apresentação/TV, sem menu administrativo, com filtros e **apenas publicações**. Pessoas únicas são contadas por cargo/turno; nomes listados por equipe. Escala não significa presença confirmada.
- Demais caminhos: página 404.

Os nomes contraditórios “Unidade Modelo Norte/Sul” do cenário foram resolvidos em favor do seed explícito: UPA ROCHA MIRANDA, CER BARRA, UPA CIDADE DE DEUS e UPA SEPETIBA. Há 72 profissionais fictícios, seis cargos e quatro equipes em cada unidade. A data inicial previsível é **06/11/2026**; existe um rascunho adicional em 07/11/2026.

## Roteiro rápido

1. Entre como gestor. O cabeçalho mostra CER BARRA sem seletor de unidade.
2. Em 06/11/2026, diurno, equipe A, Médico, carregue o modelo e confirme. Pesquise um nome, remova-o e selecione outro profissional.
3. Abra o dashboard em outra aba. Salve o rascunho: a publicação anterior permanece. Publique e confirme: o painel recebe a nova versão (sincronização por `storage` entre abas do mesmo navegador/origem).
4. Cadastre uma pessoa fictícia e desative-a. Verifique os eventos em Histórico. As escalas anteriores continuam existindo.
5. Edite um modelo em Equipes: nenhuma ocorrência já salva é alterada.
6. Use o ícone de saída no topo para alternar perfil. Entre como administrador, alterne a unidade e explore administração/histórico global.
7. “Restaurar demonstração” retorna ao seed, remove a sessão e volta à entrada.

## Arquitetura e regras

- `src/models.ts`: modelos TypeScript.
- `src/seed.ts`: seed determinístico sem chamadas externas.
- `src/domain.ts`: operações centralizadas, verificação do escopo demonstrativo e registro de auditoria.
- `src/main.tsx`: componentes, rotas, formulários, modais e estado React.
- `src/style.css`: identidade responsiva, Tailwind CSS e estilos de componentes; ícones lucide-react.
- `src/domain.test.ts`: regressões sobre publicação, isolamento por unidade, histórico, modelos, vínculos e administração.

A chave da escala é `unidade + data + turno + equipe + cargo`. Salvar substitui somente essa combinação. O estado de trabalho (`schedules`) e a última versão pública (`published`) são separados: um rascunho posterior não apaga a publicação anterior. As versões e eventos preservam antes/depois. Os nomes são resolvidos pelo ID para refletir correções; eventos guardam os valores históricos.

Profissional inativo deixa de ser oferecido para novas seleções, mas permanece nas escalas já salvas. O cargo de um profissional com escalas vinculadas não pode ser alterado por este MVP, para não reclassificar retroativamente os registros. A composição de equipes é independente das ocorrências. Novas unidades começam sem profissionais nem equipes, que podem ser criados nas telas correspondentes.

Dados são mantidos em React e, para conveniência, em `localStorage` na chave `rio-escalas-demo-v1`; o perfil demonstrativo fica em `sessionStorage`. Não há garantia de persistência, concorrência ou recuperação: abas administrativas simultâneas podem sobrescrever alterações. A restauração é local ao navegador. O botão de entrada escolhe um perfil ativo de cada tipo; associações adicionais são registros demonstrativos, não contas autenticáveis.

Os bloqueios de rota, seletor e domínio são **ilustrativos**. Todo o estado do cliente pode ser inspecionado ou alterado. Não há backend, banco, credencial, autenticação, comunicação clínica, integração hospitalar, Google Sheets, OAuth, Supabase ou API externa. O frontend não envia os dados da demonstração a serviços externos.

## Proposta futura (não implementada)

Google OAuth pode autenticar identidades via Supabase Auth. Autorização por e-mail autorizado, perfil e unidade deverá ser verificada **no servidor e no PostgreSQL com RLS**, nunca somente por ocultação de controles. Profissionais e vínculos com unidades devem permanecer separados. Publicações versionadas devem ter transações, auditoria durável e controle de concorrência. Uma camada específica de dados publicados, com escopo e minimização de dados, poderá alimentar o Looker Studio. Presença real exigiria um fluxo separado de confirmação.

Antes de qualquer uso real, será necessário um projeto próprio de segurança, privacidade, operação e validação com a gestão. Este protótipo não serve à operação real.

## Publicação pelo GitHub Pages

O código fica na branch `main`. A branch `gh-pages` contém somente o build estático. O workflow `.github/workflows/pages.yml` executa testes e build, atualizando essa branch a cada push em `main`.

No GitHub, acesse **Settings → Pages → Build and deployment**. Escolha **Deploy from a branch**, branch **gh-pages**, pasta **/ (root)** e salve. Se o repositório for privado, o plano do GitHub precisa permitir Pages; tornar o repositório público é uma decisão separada.

Após o GitHub concluir a publicação, os endereços previstos são:

- Demonstração: https://supremedev021.github.io/ProjetoEscala/
- Dashboard: https://supremedev021.github.io/ProjetoEscala/#/dashboard

O build para Pages usa `npm run build -- --base=/ProjetoEscala/`. Nesse modo, as rotas usam hash (`#/escala`, `#/cadastros` etc.) para que recarregar ou abrir links diretamente funcione sem backend. Em desenvolvimento na raiz, as rotas continuam sem hash. Os dados continuam locais em cada navegador, sem sincronização entre dispositivos.

## Dashboard modernizado

O dashboard externo é independente das telas administrativas, que foram preservadas. Os módulos ficam em `src/dashboard/`: `Dashboard.tsx` contém cabeçalho, relógio, indicador de plantão, métricas e cartões de função; `data.ts` é a camada de acesso e projeção; `dashboard.css` isola os estilos. Não foram adicionadas dependências.

- `/dashboard` abre a unidade padrão; `/painel/unidade/upa-cidade-de-deus`, `/painel/unidade/cer-barra` e os demais slugs exibem exclusivamente a unidade do endereço. No GitHub Pages use `#/painel/unidade/upa-cidade-de-deus` após `/ProjetoEscala/`.
- O horário real usa o relógio do dispositivo no fuso `America/Sao_Paulo`, atualizado a cada segundo. Diurno: 07h até 18h59; noturno: 19h até 06h59. Antes de 07h, a data de referência continua sendo o dia anterior. Ao voltar à aba, o horário é sincronizado imediatamente.
- O painel **Demonstração** reúne seleção da unidade, fonte, simulador e atalhos de transição. O relógio simulado pode ser pausado. “Voltar ao horário real” restaura a fonte local e o horário do dispositivo.
- A fonte padrão lê somente `published` do administrativo no mesmo navegador. O cenário fictício de 10 e 11/11/2026 é independente e nunca grava no administrativo. Atalhos de horário carregam esse cenário. “Simular atualização” amplia a composição apenas no cenário fictício; na fonte local o botão consulta novamente as publicações.
- Os profissionais são agrupados por cargo, ordenados alfabeticamente e deduplicados. Novos cargos na fonte aparecem automaticamente. Especialidade e setor opcional só aparecem quando cadastrados. Vínculos de outras unidades e rascunhos são descartados pela projeção. “Sem escala cadastrada” é diferente de publicação com lista vazia.
- Os indicadores mostram escalados, nunca presença confirmada. Enfermagem agrega enfermeiros e técnicos. Última atualização representa o timestamp das publicações exibidas, e não o relógio ou o instante da consulta.
- **Modo TV** aumenta as fontes. **Tela cheia** usa a API nativa do navegador. A rolagem avança lentamente, pausa por 15 segundos após interação e aguarda 7 segundos no final antes de voltar ao início. Movimento reduzido desabilita rolagem e animações. O painel de controles aberto também pausa a rolagem.
- Sem rede, os dados locais continuam disponíveis com aviso. Erros de leitura preservam o último conjunto válido e sinalizam indisponibilidade. Não há sincronização remota, autenticação ou promessa de atualização por servidor.
- Não existe arquivo oficial de logo no projeto. O cabeçalho usa um espaço reservado identificado, sem copiar o brasão ou a imagem fornecida. Substitua esse bloco por uma imagem oficial autorizada quando houver o arquivo.

A interface `DashboardRepository` permite substituir o carregamento local por uma API sem reescrever os cartões. Na integração futura, esse endpoint deve entregar somente publicações autorizadas para a unidade; Supabase/PostgreSQL/RLS e autenticação continuam fora do MVP. O painel de demonstração deve ser removido ou desabilitado na versão de produção.

`npm test` executa 11 testes, incluindo viradas exatas, madrugada/ano/mês, cargos, unidades, indicadores, deduplicação, rascunhos, estados vazios e as regressões administrativas. A interface foi verificada com Chromium em desktop, tablet, celular e modo TV, incluindo tela cheia, relógio automático, retorno à aba e estados de falha.

## Rio Saúde Command Center

O redesign atual adota a paleta azul-marinho `#06192D`, azul institucional `#064E83` e ciano `#00C8F8`. O dashboard foi reestruturado em `CommandHeader`, `CommandSummary` e `RoleSection`, em `src/dashboard/CommandLayout.tsx`, com uma única folha de estilos `dashboard.css`. A área administrativa e a camada de dados permanecem intactas.

As funções são seções de largura total, sempre empilhadas verticalmente: médicos, enfermeiros, técnicos de enfermagem, maqueiros e os demais cargos da fonte. Os nomes são listas ordenadas por ordem alfabética, com numeração apenas visual, nunca classificação. Não há cartões de funções lado a lado em nenhuma resolução. No modo TV, apenas nomes de uma mesma função podem ocupar duas colunas em telas grandes. O cabeçalho fica fixo e compacto durante a rolagem.

O resumo apresenta total de escalados, funções ocupadas, plantão e data de referência. Controles de demonstração continuam recolhidos, enquanto modo TV e tela cheia estão disponíveis no cabeçalho. O relógio, as viradas de plantão, publicações, filtros por unidade e simulador continuam funcionando.

Para inserir a logo oficial autorizada, adicione **um** arquivo `src/assets/logo-rio-saude.png`, `.svg` ou `.webp` e refaça o build. O componente inclui essa imagem automaticamente. Sem o arquivo, há somente um espaço reservado textual identificado; nenhum símbolo institucional é recriado ou substituído por ícone genérico.

Validação visual realizada no Chromium em 390, 768, 1440, 1920 e 3840 pixels de largura, verificando ordem, empilhamento vertical, ausência de overflow, modo TV e tela cheia. Os 11 testes de domínio/dashboard continuam cobrindo plantões, datas, unidades, publicações e regressões administrativas.
