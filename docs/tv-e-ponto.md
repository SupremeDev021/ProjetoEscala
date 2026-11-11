# TV e ponto facial

O dashboard inicia em Modo TV e tenta a API fullscreen. Se o navegador bloquear, o layout permanece em toda a área disponível. Os controles iniciam ocultos. Movimente o mouse, toque ou pressione uma tecla para revelá-los por cinco segundos. Uma interação fora dos controles também tenta novamente a tela cheia nativa, quando permitida. Sair do Modo TV altera apenas o layout. A saída de fullscreen só é solicitada para uma sessão aberta pelo dashboard; não encerra o navegador em quiosque.

Para abrir automaticamente em tela cheia sem interação no Windows, baixe `https://supremedev021.github.io/ProjetoEscala/iniciar-tv.cmd` e execute o arquivo. Ele abre o Edge em modo quiosque, com a URL do dashboard. Para iniciar junto com o Windows, coloque um atalho para esse arquivo na pasta aberta por `Win+R` → `shell:startup`. Edite `DASHBOARD` no arquivo caso queira outra unidade. Não há alterações em políticas de segurança do navegador.

Em uma aba normal, a Fullscreen API pode ser bloqueada sem gesto: nenhum site pode garantir a remoção automática das barras do navegador. Nesse caso o layout ocupa 100% da área disponível, os slides continuam e o botão alternativo só aparece após interação.

Alternativamente, crie um atalho com o executável instalado e a URL publicada da unidade:

```bat
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk "https://supremedev021.github.io/ProjetoEscala/#/painel/unidade/cer-barra" --edge-kiosk-type=fullscreen --no-first-run
```

Inclua o atalho na inicialização do Windows se necessário. Use Alt+F4 para encerrar o quiosque localmente. Configure energia/suspensão do Windows para a operação contínua desejada.

## Logo

A logo original está em `copy-of-untitled-design-11-.webp`, na raiz do repositório, importada diretamente pelo cabeçalho persistente. O Vite inclui a imagem no build com caminho válido para GitHub Pages e Vercel. O enquadramento CSS remove apenas as margens brancas de exibição, sem esticar ou alterar o arquivo. A logo permanece visível em todos os slides, inclusive Full HD e 4K.

## Simulação e API futura

Execute `npm run dev`, saia do Modo TV e abra “Testes de ponto”. Ative a simulação: primeiro profissional confirmado, segundo registra após 30 segundos, demais sem confirmação. Os botões simulam entradas adicionais; o LED aparece na próxima consulta de 30 segundos. O painel e sua ativação são exclusivos do desenvolvimento; a produção não gera confirmações simuladas.

`src/services/pontoFacialService.ts` separa registros, contrato de consulta, validação e fonte simulada. A fonte real deverá implementar `PontoFacialService.load` e ser selecionada explicitamente no dashboard quando houver documentação da API. Não existe integração real nesta entrega.

A validação utiliza ID do profissional, unidade, identificador do plantão, entrada recebida e confirmada e janela temporal. O padrão permite 60 minutos antes do início até o fim do plantão (exclusivo). Horários e tolerâncias são configuráveis em `PunchRules`. O noturno termina no dia seguinte. São Paulo é UTC-03 nas datas atuais; a API real deverá fornecer limites com fuso e validar permissões no servidor. Registros futuros ou de outros plantões não confirmam presença.

Somente profissionais publicados no plantão e unidade recebem LED. Identificadores e horários individuais não são renderizados no painel público. Ausência de confirmação ou falha do serviço mantém a aparência padrão, sem indicar falta. Não há imagens, templates ou dados biométricos. A API futura deve usar HTTPS, autorização e minimização de dados. A demonstração continua sendo local ao navegador, sem sincronização de publicações entre dispositivos.
