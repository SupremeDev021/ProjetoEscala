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

## Dashboard em slides por função

A versão atual usa fundo branco e **um único cargo por slide**. `CommandLayout.tsx` contém o cabeçalho persistente; `RoleCarousel.tsx` controla a apresentação e as listas, com estilos em `dashboard.css`. A área administrativa e as regras de dados permanecem intactas.

A ordem inicial é Médicos, Técnicos de Enfermagem, Enfermeiros, Maqueiros e os demais cargos cadastrados. Funções sem nomes também possuem slide com estado vazio. Apenas o slide atual está montado: nenhum nome de outra função aparece simultaneamente.

A reprodução avança a cada 10 segundos, inclusive fora do modo TV. É possível pausar/retomar, navegar com setas na tela ou teclas esquerda/direita. Interações manuais aguardam 15 segundos antes de retomar; foco, ponteiro sobre a apresentação, controles abertos ou aba oculta suspendem o avanço. Ao retornar à aba, há um novo intervalo de leitura, sem saltar diversos slides de uma vez. O checkbox no painel de demonstração desabilita a reprodução automática.

Listas longas têm páginas internas. Todas as páginas de um cargo são exibidas antes do próximo cargo. O contador diferencia “Slide 1 de 6” de “Página 2 de 3 desta função”. O número de nomes por página se adapta à resolução e ao modo TV; duas colunas são usadas somente dentro do mesmo cargo quando há muitos nomes. Os números da lista são apenas ordem visual alfabética.

Cabeçalho, relógio de São Paulo e plantão se mantêm durante a troca de slides. Unidade, data de referência ou plantão novos reiniciam a apresentação. A virada noturna após meia-noite, o modo TV, tela cheia, a fonte de publicações e o simulador continuam funcionando. Rascunhos e nomes de outras unidades permanecem excluídos.

Não foi fornecido arquivo oficial de logo: há um espaço reservado textual identificado. Para ativar a imagem oficial, adicione **um** arquivo `src/assets/logo-rio-saude.png`, `.svg` ou `.webp` e refaça o build. O cabeçalho inclui essa imagem automaticamente; nenhum símbolo institucional é recriado.

Validações: build para GitHub Pages, 11 testes de domínio/plantões e Chromium em celular, tablet, Full HD e 4K, cobrindo um cargo por slide, reprodução automática, pausa/retomada, setas, paginação de 30 nomes, unidade e plantão.

### Refinamento visual da apresentação

O acabamento atual preserva carrossel, tempos, paginação, dados, rotas e plantões. `refinement.css` aplica a faixa azul `#07538A → #087DC0`, o nome da unidade em peso 800 e nomes dos profissionais em peso 700 sobre linhas suaves `#F4F8FC`. Os ícones e contadores do cargo são apenas apresentação; nenhum estado, intervalo ou filtro foi alterado. O indicador de plantão foi reposicionado junto ao relógio. A imagem oficial continua usando o mesmo ponto de entrada documentado acima.

### Abertura direta em TV

O dashboard público agora inicia com modo TV ativado e horário real de São Paulo. A interface de demonstração, simulador e os textos de aviso solicitados foram retirados da tela pública. O carrossel continua automático, com setas e pausa. O plantão e os horários ficaram maiores. Os dados continuam exclusivamente locais/publicados; sem publicação na data e no turno atuais, o painel apresenta o estado vazio. Os rótulos e as funcionalidades da área administrativa foram preservados.

O navegador exige uma interação para entrar em tela cheia nativa; o botão continua disponível. O layout TV e a reprodução dos slides já estão ativos na abertura, sem depender desse botão. A logo deve ser incluída como arquivo em `src/assets/logo-rio-saude.png`, `.svg` ou `.webp`; o cabeçalho passa a carregá-la automaticamente no próximo build.
