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
npm test            # 6 testes das regras de domínio
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
