# Resultados técnicos · primeira entrega

Registro da primeira entrega em 24/11/2026. Ambiente principal: macOS 26.5.1 arm64, Node.js 24.13.0, Python 3.12.0, Chrome 158.0.8127.38 com WebGL via SwiftShader, A-Frame 1.8.0 e Caddy 2.11.9.

| Rodada | Observação | Resultado e acompanhamento |
|---|---|---|
| D-001 | Regras de domínio exercitadas isoladamente | 12/12 passaram. Cada cenário e seus controles negativos estão no [registro de domínio](evidencias/dominio.md). |
| C01–C06 | Estação 3D, retorno dos objetos, textos, mouse e gestos sintéticos | Houve placas brancas, enquadramento insuficiente e perda da posição de retorno do copo. Falhas, correções e retestes estão no [registro da cena](evidencias/cena.md). |
| N-01 | Execução conjunta de domínio e gestos com npm test | 17/17 passaram, sem pulos ou cancelamentos, em 272,62 ms. Execução anterior à última centralização do relógio. |
| B-01 | Abrir, iniciar, pausar, inspecionar manual e testar erro de receita e recuperação no Chrome | A asserção parou no segundo cliente. O CSS exibia 22H15 e o roteiro comparava o texto apresentado a 22h15. O horário do jogo estava correto. Ajustada a leitura para textContent. |
| B-02 | Repetir o ensaio após corrigir a leitura do horário | O modo assistido chegou ao fim dos três pedidos e reiniciou. Passaram pausa, manual, pia, mensagens de erro, áudio, largura de 390 px e ausência de requisições HTTP externas durante o ensaio. |
| B-03 | Acrescentar ensaio por ponteiro real sobre pixels visíveis do canvas | A sonda deixou de localizar o copo após lavá-lo. A correção foi registrar a origem explícita dos utensílios, descrita em C03–C04. |
| B-04 | Repetir os dois fluxos após corrigir o retorno do copo | Passaram os três pedidos no modo assistido e os três com mouse/tecla E, com lavagem, maceração, agitação e entrega na bandeja. [Executivo](evidencias/capturas/executivo.png) · [Fim da amostra](evidencias/capturas/amostra-concluida.png). |
| H-01 | Validar e executar Caddy com porta livre e autoridade efêmera. Acessar por HTTPS com curl e a raiz pública indicada por --cacert | Configuração válida. Index, CSS, runtime A-Frame, domínio e estação retornaram com sucesso e certificado verificado. Teste em loopback do computador. |
| M-01 | Abrir a prancha com rede desligada nas larguras de 1440 e 390 px | Imagens decodificadas e largura contida. [Verificação do moodboard e ocorrências da pesquisa](moodboard/VERIFICACAO.md). |
| A-01 | Comparação da cópia do devlog, inspeção da licença e do diretório de assets | Cópia idêntica ao original, pasta reservada presente. SHA-256 do runtime local: 27a49c530c18c0710f5d0b9492934d5ba6670fe492be37a5e5ea890f26a9864f. |
| B-05 | Reteste da revisão mais recente | Pendente ao pausar. Depois de B-04 o relógio foi centralizado, os testes passaram a inspecionar materiais das placas, as duas mãos configuradas e erros de console, os dois ensaios 3D foram consolidados e houve formatação. Reexecutar npm test e npm run test:browser e acrescentar uma nova linha com a saída real. |
| B-05 · execução após retomada | npm test e npm run test:browser na revisão integrada | 17/17 passaram em 140,51 ms. Chrome 158.0.8127.38 e A-Frame 1.8.0 concluíram os três pedidos por ambas as interfaces, verificaram as placas e a configuração dos dois controles, sem erros de console, de página, respostas HTTP de erro ou requisições externas durante o ensaio. Ambos os comandos encerraram com código 0. |
| A-02 | Conferir referências locais do README, documentos Markdown, prancha e página inicial, e comparar a instrução de troca do copo com a interface | Os 58 destinos locais conferidos antes do fechamento existiam. O roteiro passou a identificar a placa pelo modelo exibido, por exemplo COPO · HIGHBALL. |

Os resultados humanos são registrados exclusivamente na [ficha do participante](resultados-humanos.md). Não houve sessão imersiva em hardware real.

**B-06 · estoque permanente · 24/11/2026.** Os 17 testes de domínio e movimento passaram. No Chrome 158, o ensaio confirmou que cada ingrediente do catálogo estava visível na abertura e nas mesmas coordenadas na troca de clientes e após o reinício. Os três pedidos foram concluídos pelos objetos 3D e pelo painel assistido. Alcance das seis garrafas e dos três sólidos no Quest físico segue pendente.

**B-07 · livro e copos · 24/11/2026.** 18 testes passaram. A caipirinha completa e macerada na Coupe foi recusada com a indicação de Rocks, mantendo a Turista no balcão. No Chrome, o mouse folheou o livro sobre a bancada entre Cuba Libre e Caipirinha e os três atendimentos foram concluídos. A leitura e o uso pelo gatilho aguardam o Quest físico.

**B-08 · navegação e suporte de copos · 24/11/2026.** Os 18 testes de regras e gestos passaram. No primeiro ensaio de navegador, o clique destinado à Coupe manteve o Rocks selecionado. A seleção por raio passou a ignorar partes ocultas dos objetos. No reteste em Chrome, o livro avançou e voltou sem mudar o cliente, cada um dos três modelos pôde ser escolhido pelo suporte, e os três pedidos foram concluídos. Leitura e alcance físicos seguem pendentes no Quest 3.

**B-09 · entrega direta ao cliente · 24/11/2026.** Os 18 testes passaram. No Chrome, o Executivo recusou o copo vazio e aceitou o Cuba Libre entregue na mão estendida. A Turista recebeu a Caipirinha pela bandeja e o Aposentado recebeu o Whiskey Sour diretamente na cena. O fluxo assistido também passou. O gesto de soltar o grip, o alcance e o conforto aguardam teste no Quest físico.

**B-10 · cena em janela inteira · 24/11/2026.** Os 18 testes passaram. O Chrome confirmou que o canvas cobre a janela da base do cabeçalho à borda inferior em 1440 × 900 e 390 × 844. O fluxo dos três clientes passou tanto pela cena quanto pelo Caderno aberto sob demanda.

**B-11 · drinks exóticos ambientais · 24/11/2026.** O Chrome 158 concluiu os nove pedidos pelos objetos da cena e pelo Caderno. O roteiro assistido coletou, devolveu, recolheu, adicionou e lavou o recipiente antes de preparar novamente cada especial. Na cena, a captura, a adição e a entrega passaram nos três eventos. O último atendimento foi o Homem Alongado. Nenhum pedido corporal foi incluído. A primeira rodada conjunta teve 24 testes aprovados; após a inclusão dos dois ensaios temporais dos eventos, passaram 26/26. As falhas de expectativas da suíte antiga e o reteste estão no [registro do domínio](evidencias/dominio.md).

Capturas do ensaio com as fontes ambientais ativas: [barata na parede](evidencias/exoticos/negroni_cockroach.png), [gosma no balcão](evidencias/exoticos/moscow_mule_slime.png) e [aranha na teia](evidencias/exoticos/martini_spider.png). Os ensaios de ergonomia e alcance no Quest físico continuam pendentes.

**B-12 · reteste integrado.** Após as ocorrências C09–C10 no [registro da cena](evidencias/cena.md), o teste completo em http://127.0.0.1:8187 terminou com código 0: nove entregas pelo Caderno, nove pela cena 3D, descarte e recaptura da barata e coleta da aranha após a descida. Suíte final: 26/26.

**B-13 · primeiro clique no balcão.** Na versão anterior, o clique na placa Iniciar seguido de rum e copo funcionou no Chrome. A sessão em menu ignorava tentativas de pegar objetos antes dessa ação. Após o ajuste, o teste em 127.0.0.1:8187 começou clicando diretamente no rum, confirmou a dose no copo e, após recarregar, iniciou pelo botão da barra superior. Os nove atendimentos passaram no navegador e os 26 testes técnicos passaram.

**B-14 · receitas-base no livro.** O teste no Chrome conferiu os títulos Negroni, Moscow Mule e Martini e a ausência de ingredientes exóticos e instruções de coleta nas páginas do Manual. As páginas 3D usam o mesmo catálogo. Os nove pedidos foram concluídos pelas duas interfaces, incluindo os três acréscimos ambientais solicitados pelos clientes. Os 26 testes técnicos passaram.

**B-15 · reorganização do posto.** O roteiro no Chrome completou os nove pedidos com mouse e teclado e os nove pelo Caderno. Na cena, as garrafas da estante traseira foram dosadas e devolvidas às bases. A colher retirou açúcar do pote e as duas cubas serviram para lavar e retirar gelo. As vistas frontal, lateral e traseira foram inspecionadas para ajustar os rótulos. Passaram 29 testes automatizados. Em um ensaio adicional com controles e poses simulados, a inclinação contínua registrou uma dose de rum, a outra mão recuperou a garrafa reposicionada e a soltura no espaço livre deixou a garrafa no piso. O mesmo ensaio confirmou gelo e açúcar no copo. Alcance, conforto e leitura em um Quest físico aguardam teste.
