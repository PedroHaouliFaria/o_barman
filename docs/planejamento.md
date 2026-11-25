# Acompanhamento do desenvolvimento

## Recorte em desenvolvimento · expansão dos pedidos ambientais

A solicitação amplia a amostra técnica da primeira entrega. As exigências acadêmicas vigentes continuam sendo ficha do projeto, plano de testes com resultados e moodboard. O histórico abaixo registra as decisões do recorte anterior.

| Área | Entrega do recorte | Verificação e dependência |
|---|---|---|
| Atendimento | Nove pedidos, na ordem 1–8 e 10 do devlog. Após quatro pedidos convencionais, a barata antecede o retorno à rotina com Mojito e Dry Martini. A gosma e a aranha completam o percurso. | Servir cada receita, conferir a mudança do cliente e reiniciar após o Homem Alongado. |
| Bancada | Colher, caneca, ingredientes comuns em posições fixas e páginas de consulta livre. As fontes dos três especiais pertencem ao cenário do pedido ativo. | Conferir quantidades, copo, técnica após a última adição e limpeza na pia. |
| Eventos ambientais | Capturar a barata, recolher a gosma depois da passagem da lesma e aguardar a descida da aranha. Recuperar o ingrediente após soltura ou descarte. | Casos D-07 a D-10 e Q-08 no [plano de testes](plano-de-testes.md). |
| Validação | Resultados automáticos por rodada e espaço para registrar as observações em desktop e headset. | Consultar [evidências técnicas](resultados-tecnicos.md) e [controle humano](resultados-humanos.md). Execução física continua pendente. |
| Backlog da versão final | Pedidos 9 e 11–15, efeitos corporais fictícios, deterioração audiovisual, contrato e cutscene. | Manter a numeração canônica e reintegrar a Dama Pálida entre os clientes 8 e 10. O último pedido deste recorte encerra a amostra técnica. |

## Primeira entrega informada · planejamento original · 24/11/2026

| Requisito acadêmico | Objetivo da semana | Estado e material |
|---|---|---|
| Ficha do projeto | Registrar premissa, público, objetivos, escopo e dados de equipe disponíveis | Elaborada em [Ficha do projeto](ficha-do-projeto.md). Nomes e atribuições aguardam definição. |
| Plano, mecânicas e resultados | Permitir testar no balcão uma receita montada, uma macerada e uma agitada, inclusive recuperação de erro | Amostra implementada. Execuções técnicas em [Resultados técnicos](resultados-tecnicos.md). Validação humana pendente no [plano](plano-de-testes.md) e no [registro](resultados-humanos.md). |
| Moodboard | Orientar espaço, objetos e deterioração gradual com referências identificáveis | Prancha visual em [Moodboard](moodboard/index.html), independente do ambiente jogável. |

## Decisões da primeira entrega

- O repositório inicial continha um README de uma linha. A estrutura da atividade determina o diretório público e o local da documentação. O devlog fornecido foi preservado na raiz.
- Foram escolhidos o Executivo, a Turista e o Aposentado porque seus pedidos introduzem três técnicas distintas em ordem narrativa. O quarto cliente repete a coqueteleira e fica no backlog. A amostra termina após três aprovações, com opção de reinício.
- Cada ingrediente vale uma unidade. Highball, rocks e coupe são os recipientes adotados para esses três pedidos. Trocar um copo com conteúdo exige lavá-lo antes. A pia preserva o pedido e o relógio. O gelo da coqueteleira continua no registro após a transferência.
- As regras vivem no domínio JavaScript. Primitivas, posições e rótulos pertencem à cena. Controles e painel acessível enviam os mesmos comandos ao domínio. A experiência assistida de desktop permite investigar regras separadamente da destreza no controle 3D.
- Configuração local de A-Frame fixada na versão 1.8.0. Sons curtos sintetizados e rótulos desenhados localmente dispensam downloads de mídia no jogo. O Caddy serve diretamente a pasta public.
- O progresso dura uma sessão da página. Pausa, consulta ao manual e rejeição de uma receita conservam o turno. Meta de 72 FPS e duração de 20–30 minutos pertencem à avaliação futura no hardware e na versão completa, respectivamente.

## Fila registrada na primeira entrega

| Situação | Trabalho | Dependência ou critério |
|---|---|---|
| Concluído na implementação | Estrutura, ficha, balcão 3D, recorte de três clientes, preparo, controles, documentação, moodboard e automação técnica | Ver evidências e ocorrências no registro técnico. |
| Aguardando execução | Testes humanos desktop, de clareza das instruções, manuseio e fluxo | Participante executa os casos e registra resultados reais, inclusive falhas. |
| Aguardando dispositivo | XR, ambas as mãos, recalibração sentado/em pé, conforto, legibilidade, desempenho e retorno após interrupção | Quest 3 e endereço HTTPS confiável. |
| Aguardando definição | Nomes e responsabilidades, conteúdo definitivo da cutscene e nova exigência acadêmica | Informação da equipe ou da faculdade. |
| Provisório | Ajustar limiares de despejo, agitação e alcance; comparar técnica assistida e física | Resultados humanos e retestes em hardware. |
| Backlog do jogo final | Festeira e demais clientes, técnica de mexer, manual expandido, três eventos com recuperação, cinco efeitos cumulativos com conforto, progressão de atos, contrato, morte e cutscene separada | Preservar retornos à normalidade, abstração dos sacrifícios e ordem do devlog. Prioridade futura sujeita às entregas informadas. |
| Backlog de apresentação | Arte e áudio definitivos, calibração sensorial e otimização no dispositivo | Solicitação posterior para iniciar polimento e medições reais. |

## Histórico

| Data | Mudança e motivo | Impacto |
|---|---|---|
| 24/11/2026 | Abertura do projeto. O roteiro de cinco semanas do devlog foi tratado como referência técnica provisória. As únicas exigências acadêmicas conhecidas são as três acima. | Recorte de três pedidos e greybox. Validação humana reservada à pessoa responsável. |
| 24/11/2026 | Introdução de um registro de execução por tentativa e de retestes vinculados. | Problemas e verificações da etapa ficam em [Resultados técnicos](resultados-tecnicos.md) e no histórico humano. |

Ao receber a próxima exigência, registrar data, requisito, partes reaproveitáveis, dependências, prioridade e critério de verificação nesta página. Manter o histórico atual e relacionar os resultados novos às implementações que foram alteradas.

**Pausa solicitada pelo usuário em 24/11/2026.** O estado de cada entrega, a estimativa de progresso e o primeiro comando de retomada estão no [ponto de retomada](entrega-01.md). Na pausa, a revisão integrada aguardava a rodada B-05.

**Retomada e fechamento em 24/11/2026.** Rodada B-05 aprovada e documentação conferida. Os 14 critérios técnicos estão atendidos. A etapa em aberto é a execução dos 13 roteiros humanos.

**24/11/2026 · Estoque da bancada.** A pedido do usuário, os nove ingredientes da amostra permanecem disponíveis em lugares fixos durante todo o turno. A progressão dos clientes desbloqueia as páginas do manual.

**24/11/2026 · Consulta livre e escolha de copos.** As três receitas da amostra agora estão disponíveis desde a abertura. O livro conserva a página entre pedidos, permite avançar e voltar e lista ingredientes, copo e preparo. O suporte exibe os três modelos selecionáveis.

**24/11/2026 · Expansão ambiental.** O recorte passou de três para nove clientes para experimentar o primeiro pedido estranho, a volta a dois atendimentos comuns e os três eventos ambientais. A caneca e a colher passaram a integrar os ensaios de manipulação. O pedido corporal 9 ficou reservado para o fluxo completo. A equipe poderá ajustar tempos, raio de seleção e pistas após registrar as observações das novas execuções.
