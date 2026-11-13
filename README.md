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
npm test            # 31 testes de domínio e dashboard
npm run preview     # servir o build localmente
```

## Experiência

- `/`: entrada simulada como administrador geral ou gestor de CER BARRA.
- `/escala`: montagem por cargo no dia atual de São Paulo, com seleção em qualquer ordem e publicação conjunta ao final.
- `/cadastros`: criar, editar, desativar e reativar profissionais, com vínculos por unidade separados do cadastro.
- `/equipes`: criar e editar modelos fixos por cargo, com turno opcional.
- `/historico`: publicações agrupadas por unidade/data/turno/equipe com opção Copiar escala, além dos eventos locais com antes/depois; administrador vê e filtra todas as unidades.
- `/administracao`: unidades e associações de acesso fictícias, restritas ao perfil global na simulação.
- `/dashboard`: layout independente para apresentação/TV, sem menu administrativo, com filtros e **apenas publicações**. Pessoas únicas são contadas por cargo/turno; nomes listados por equipe. Escala não significa presença confirmada.
- Demais caminhos: página 404.

Os nomes contraditórios “Unidade Modelo Norte/Sul” do cenário foram resolvidos em favor do seed explícito: UPA ROCHA MIRANDA, CER BARRA, UPA CIDADE DE DEUS e UPA SEPETIBA. Há 72 profissionais fictícios, seis cargos e quatro equipes em cada unidade. A data inicial previsível é **06/11/2026**; existe um rascunho adicional em 07/11/2026.

## Montagem por cargo e cópia pelo Histórico

1. Entre como gestor ou administrador e defina unidade e turno. A data é somente leitura e sempre corresponde ao dia atual em `America/Sao_Paulo`.
2. Selecione qualquer cargo na lista e escolha a equipe na seção de profissionais. Marque profissionais ou carregue a equipe padrão. Para cada pessoa selecionada, escolha a jornada. O modelo fixo é preservado.
3. Use **Confirmar cargo** para salvar a composição no navegador. A lista e o seletor exibem um check verde com o texto **Concluído**. Sem seleção, confirme explicitamente **Nenhum profissional para este cargo**. Trocar de cargo preserva as edições em andamento. Ao editar um cargo confirmado, o seletor mostra **Alterações não salvas** até a próxima confirmação.
4. **Publicar escala** fica disponível quando todos os cargos estão confirmados e há pelo menos uma pessoa. Confira o resumo de unidade, data, turno, equipe e quantidades por cargo e confirme a publicação final.
5. A montagem restaura as composições e jornadas confirmadas para a mesma unidade, data, turno e equipe. A publicação conjunta valida tudo em uma cópia isolada antes de substituir o estado. Cargos vazios substituem nomes anteriormente publicados na mesma chave. Versões e eventos de auditoria são preservados. O fluxo reinicia e limpa as confirmações daquela montagem após o sucesso.
6. Em **Histórico**, use **Copiar escala** em uma publicação agrupada. A cópia abre uma montagem para hoje, sem publicar e com todos os cargos pendentes de confirmação. Publicações antigas de um único cargo preenchem apenas esse cargo. Nomes inativos, sem vínculo ativo ou de cargo incompatível são descartados e informados. Equipes inativas impedem a cópia. Origem e modelos são preservados.
7. Para copiar uma publicação de outra unidade, o administrador deve confirmar explicitamente a troca da unidade ativa. Gestores só acessam a própria unidade.

Trocar unidade, turno ou equipe com edições não salvas solicita confirmação de descarte. A tela verifica a data a cada segundo e ao receber foco ou retornar de uma aba suspensa. Quando o dia muda, a tela avisa e abre a montagem da nova data. O domínio também rejeita datas diferentes do dia atual, inclusive na função legada `saveSchedule`. No dashboard, durante a madrugada, o noturno pertence à data em que começou.

O indicador “Escalas publicadas”, a seção “Escalas existentes” e o botão “Salvar rascunho” foram removidos da montagem. Registros e rascunhos existentes permanecem armazenados. “Restaurar demonstração” continua removendo os dados locais e retornando ao seed.

## Arquitetura e regras

- `src/models.ts`: modelos TypeScript.
- `src/seed.ts`: seed determinístico sem chamadas externas.
- `src/domain.ts`: operações centralizadas, data de São Paulo, publicação conjunta atômica no estado local, cópia validada, escopo demonstrativo e auditoria.
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
- Os profissionais são agrupados por cargo, ordenados alfabeticamente e deduplicados. Novos cargos na fonte aparecem automaticamente. Especialidade foi removida da apresentação; somente nomes e cargos são exibidos. Vínculos de outras unidades e rascunhos são descartados pela projeção. “Sem escala cadastrada” é diferente de publicação com lista vazia.
- Os indicadores mostram escalados, nunca presença confirmada. Enfermagem agrega enfermeiros e técnicos. Última atualização representa o timestamp das publicações exibidas, e não o relógio ou o instante da consulta.
- **Modo TV** aumenta as fontes. **Tela cheia** usa a API nativa do navegador. A rolagem avança lentamente, pausa por 15 segundos após interação e aguarda 7 segundos no final antes de voltar ao início. Movimento reduzido desabilita rolagem e animações. O painel de controles aberto também pausa a rolagem.
- Sem rede, os dados locais continuam disponíveis com aviso. Erros de leitura preservam o último conjunto válido e sinalizam indisponibilidade. Não há sincronização remota, autenticação ou promessa de atualização por servidor.
- A logo oficial fornecida está em `copy-of-untitled-design-11-.webp`, na raiz. O cabeçalho importa o original e o Vite inclui a imagem na publicação.

A interface `DashboardRepository` permite substituir o carregamento local por uma API sem reescrever os cartões. Na integração futura, esse endpoint deve entregar somente publicações autorizadas para a unidade; Supabase/PostgreSQL/RLS e autenticação continuam fora do MVP. O painel de demonstração deve ser removido ou desabilitado na versão de produção.

`npm test` executa 31 testes, incluindo viradas exatas, madrugada/ano/mês, cargos, unidades, indicadores, deduplicação, rascunhos, estados vazios e as regressões administrativas. A interface foi verificada com Chromium em desktop, tablet, celular e modo TV, incluindo tela cheia, relógio automático, retorno à aba e estados de falha.

## Dashboard em slides por função

A versão atual usa fundo branco e **um único cargo por slide**. `CommandLayout.tsx` contém o cabeçalho persistente; `RoleCarousel.tsx` controla a apresentação e as listas, com estilos em `dashboard.css`. A área administrativa e as regras de dados permanecem intactas.

A ordem inicial é Médicos, Técnicos de Enfermagem, Enfermeiros, Maqueiros e os demais cargos cadastrados. Funções sem nomes também possuem slide com estado vazio. Apenas o slide atual está montado: nenhum nome de outra função aparece simultaneamente.

A reprodução avança a cada 10 segundos, inclusive fora do modo TV. É possível pausar/retomar, navegar com setas na tela ou teclas esquerda/direita. Interações manuais aguardam 15 segundos antes de retomar; foco, ponteiro sobre a apresentação, controles abertos ou aba oculta suspendem o avanço. Ao retornar à aba, há um novo intervalo de leitura, sem saltar diversos slides de uma vez. O checkbox no painel de demonstração desabilita a reprodução automática.

Listas longas têm páginas internas. Todas as páginas de um cargo são exibidas antes do próximo cargo. O contador diferencia “Slide 1 de 6” de “Página 2 de 3 desta função”. O número de nomes por página se adapta à resolução e ao modo TV; duas colunas são usadas somente dentro do mesmo cargo quando há muitos nomes. Os números da lista são apenas ordem visual alfabética.

Cabeçalho, relógio de São Paulo e plantão se mantêm durante a troca de slides. Unidade, data de referência ou plantão novos reiniciam a apresentação. A virada noturna após meia-noite, o modo TV, tela cheia, a fonte de publicações e o simulador continuam funcionando. Rascunhos e nomes de outras unidades permanecem excluídos.

A logo oficial `copy-of-untitled-design-11-.webp` é exibida pelo cabeçalho persistente em todos os slides, sem recriar símbolos institucionais.

Validações: build para GitHub Pages, 11 testes de domínio/plantões e Chromium em celular, tablet, Full HD e 4K, cobrindo um cargo por slide, reprodução automática, pausa/retomada, setas, paginação de 30 nomes, unidade e plantão.

### Refinamento visual da apresentação

O acabamento atual preserva carrossel, tempos, paginação, dados, rotas e plantões. `refinement.css` aplica a faixa azul `#07538A → #087DC0`, o nome da unidade em peso 800 e nomes dos profissionais em peso 700 sobre linhas suaves `#F4F8FC`. Os ícones e contadores do cargo são apenas apresentação; nenhum estado, intervalo ou filtro foi alterado. O indicador de plantão foi reposicionado junto ao relógio. A imagem oficial utiliza o arquivo original na raiz do repositório.

### Abertura direta em TV

O dashboard público agora inicia com modo TV ativado e horário real de São Paulo. A interface de demonstração, simulador e os textos de aviso solicitados foram retirados da tela pública. O carrossel continua automático, com setas e pausa. O plantão e os horários ficaram maiores. Os dados continuam exclusivamente locais/publicados; sem publicação na data e no turno atuais, o painel apresenta o estado vazio. Os rótulos e as funcionalidades da área administrativa foram preservados.

O navegador exige uma interação para entrar em tela cheia nativa; o botão continua disponível. O layout TV e a reprodução dos slides já estão ativos na abertura, sem depender desse botão. A logo original `copy-of-untitled-design-11-.webp` já está vinculada ao cabeçalho. Os controles iniciam ocultos e aparecem por cinco segundos após interação. O arquivo `public/iniciar-tv.cmd` abre o Edge em quiosque no Windows para tela cheia automática sem clique; pode ser iniciado junto com o sistema.

### Controles de TV e confirmação de ponto

As instruções atualizadas para quiosque Windows, arquivo da logo e simulação de ponto estão em [docs/tv-e-ponto.md](docs/tv-e-ponto.md). A simulação de ponto é habilitada explicitamente no painel exclusivo de desenvolvimento fora do Modo TV; não aparece na produção. O serviço separado valida unidade, identificador, plantão e janela de horário. `npm test` inclui as regressões de ponto facial. `vercel.json` permite abrir rotas diretamente na publicação Vercel.

### Validação da montagem

`npm test` cobre data/fuso, rejeição de outras datas, publicação conjunta, cargos vazios, ausência de alterações parciais, versões, duplicatas, cópia com filtragem e isolamento por unidade, além das regressões existentes de cadastro e dashboard. `npm run build` valida TypeScript e o bundle de produção. O fluxo no Chromium foi verificado com confirmação/revisão, navegação, publicação final, cópia, cancelamento de descarte, retorno após mudança de dia e visualização móvel.


## Integração Ponto Facial, CBO e jornadas

A área administrativa inclui **Integração Ponto Facial**, com configuração Biofinger/Hikvision e relações de IDs independentes por unidade. O estado permanece **Aguardando configuração da integração**, sem sincronização real, endpoint inventado ou acesso a equipamentos pelo navegador. Só há referência por alias a uma futura credencial no servidor. Não informe segredos nesta demonstração.

O cadastro básico mantém nome e cargo, vínculos e ativação/desativação. A especialidade legada fica preservada no armazenamento histórico, mas é removida dos formulários, listas e dashboard. O catálogo aditivo contém os 50 CBOs solicitados, sem reclassificar profissionais existentes nem trocar IDs.

Em Profissionais do CER BARRA há uma prévia de importação **fictícia**, com decisão e confirmação explícitas, códigos desconhecidos e possíveis correspondências encaminhados para revisão. Não foi recebida a planilha nominal nesta solicitação. A demonstração pública não permite carregar ou editar uma listagem real e não persiste CPF/CNS.

A montagem oferece **12×36**, **24 horas** e **diarista de 8 horas** por profissional. A jornada de 24 horas começa no diurno e cobre também o noturno até as 07h. Diaristas têm início configurável entre 07h e 11h (padrão 08h) e deixam o painel ao completar 8 horas. Ao copiar uma escala antiga, os profissionais recebem a jornada gravada na origem. Não há geração de recorrência ou cálculo automático de descanso.

Detalhes, contratos, limitações e lista do que falta para conectar: [Integração Biofinger/Hikvision](docs/integracao-biofinger.md). `npm test` inclui as regressões de integração, importação/CBO e jornadas; `npm run build` valida TypeScript e o bundle.
