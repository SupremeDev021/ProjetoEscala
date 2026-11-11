# TV e ponto facial

O dashboard inicia em Modo TV e tenta a API fullscreen. Se o navegador bloquear, o layout permanece em toda a área disponível. Movimente o mouse, toque ou pressione uma tecla para revelar os controles. Sair do Modo TV altera apenas o layout. A saída de fullscreen só é solicitada para uma sessão aberta pelo dashboard; não encerra o navegador em quiosque.

Para Windows, crie um atalho com o executável instalado e a URL publicada da unidade:

```bat
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk "https://SEU-DOMINIO/painel/unidade/cer-barra" --edge-kiosk-type=fullscreen --no-first-run
```

Inclua o atalho na inicialização do Windows se necessário. Use Alt+F4 para encerrar o quiosque localmente. Configure energia/suspensão do Windows para a operação contínua desejada.

## Logo

A imagem enviada pelo chat precisa estar disponível como arquivo. Salve o original em `src/assets/logo-rio-saude.png`, `.svg`, `.webp`, `.jpg` ou `.jpeg` e refaça `npm run build`. O Vite inclui o arquivo no build, com caminho compatível com a base configurada. O cabeçalho persistente mantém a logo em todos os slides. Não há reprodução ou logo fictícia. Sem arquivo, permanece o espaço reservado.

## Simulação e API futura

Execute `npm run dev`, saia do Modo TV e abra “Testes de ponto”. Ative a simulação: primeiro profissional confirmado, segundo registra após 30 segundos, demais sem confirmação. Os botões simulam entradas adicionais; o LED aparece na próxima consulta de 30 segundos. O painel e sua ativação são exclusivos do desenvolvimento; a produção não gera confirmações simuladas.

`src/services/pontoFacialService.ts` separa registros, contrato de consulta, validação e fonte simulada. A fonte real deverá implementar `PontoFacialService.load` e ser selecionada explicitamente no dashboard quando houver documentação da API. Não existe integração real nesta entrega.

A validação utiliza ID do profissional, unidade, identificador do plantão, entrada recebida e confirmada e janela temporal. O padrão permite 60 minutos antes do início até o fim do plantão (exclusivo). Horários e tolerâncias são configuráveis em `PunchRules`. O noturno termina no dia seguinte. São Paulo é UTC-03 nas datas atuais; a API real deverá fornecer limites com fuso e validar permissões no servidor. Registros futuros ou de outros plantões não confirmam presença.

Somente profissionais publicados no plantão e unidade recebem LED. Identificadores e horários individuais não são renderizados no painel público. Ausência de confirmação ou falha do serviço mantém a aparência padrão, sem indicar falta. Não há imagens, templates ou dados biométricos. A API futura deve usar HTTPS, autorização e minimização de dados. A demonstração continua sendo local ao navegador, sem sincronização de publicações entre dispositivos.
