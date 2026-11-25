# Ficha do projeto · Spirits & Spirits

| Campo | Definição |
|---|---|
| Título provisório | Spirits & Spirits |
| Conceito | Um bartender aprende o trabalho em um bar que cobra um preço cada vez mais pessoal pelo atendimento. Quanto melhor cumpre o turno, menos humano se torna. |
| Gênero e perspectiva | Simulação de bartender em primeira pessoa, com terror psicológico e corporal estilizado. Experiência linear, individual. |
| Ambientação | Um turno noturno em um bar compacto. O balcão em U delimita o posto do jogador, com o cliente à frente, pia e utensílios à esquerda, manual e ingredientes à direita. |
| Público pretendido | Jovens adultos e adultos interessados em realidade virtual, experiências narrativas e terror. |
| Plataformas | Meta Quest 3 via WebXR e navegador desktop com WebGL. |
| Objetivo | Ouvir o pedido, consultar o manual, preparar a receita e servi-la no copo adequado. Na versão final, encerrar o expediente assinando um contrato. |
| Experiência pretendida | Primeiro adquirir confiança pela repetição do ofício. Depois questionar pedidos aparentemente normais enquanto o ambiente se deteriora e os efeitos de escolhas anteriores persistem. |
| Tecnologias | HTML, CSS, JavaScript em módulos, A-Frame, WebXR e Web Audio. Servidor estático com HTTPS via Caddy. |
| Diferencial | Labor manual em uma única estação, sem locomoção artificial, combinado com pedidos sobrenaturais e consequências sensoriais cumulativas. O relógio avança por atendimento aprovado. |
| Meta de duração | 20–30 minutos para o jogo completo. Duração e conforto aguardam medição com participantes. |
| Integrantes e responsabilidades | Aguardando definição da equipe. A distribuição de atividades sugerida no devlog é uma proposta. |

## Arco da experiência final

| Trecho | Clientes e mudança dramática |
|---|---|
| I · Normalidade | Do Executivo à Festeira, quatro pedidos convencionais ensinam o ofício. |
| II · Primeira anomalia | O Cavalheiro pede uma barata. Dois pedidos convencionais precedem a aparição da gosma no balcão. |
| III · Algo está errado | Surgem o sangue fictício e a aranha. A Desavisada pede uma gin-tônica enquanto os sinais anteriores persistem. O Cego exige o olho virtual. |
| IV · Degradação | Sem-Rosto, Sorridente e Proprietário exigem orelha, dentes e dedo do avatar. Interações abstratas preservam a capacidade de continuar o turno. |
| Epílogo | Após o 15º pedido, o bar fecha. O protagonista assina o contrato, que entra em combustão. A morte é representada por fade e áudio com câmera estável. Uma cutscene separada conduz aos créditos. Seu conteúdo definitivo permanece aberto. |

## Mecânicas e recorte desta entrega

A versão final prevê 15 receitas, três eventos ambientais recuperáveis, cinco consequências persistentes, técnicas de montar, macerar, mexer e agitar e opções de conforto sensorial. A sequência de clientes, ingredientes e falas consta no [devlog](../DEVLOG_SPIRITS_AND_SPIRITS_CODEX.md).

A primeira entrega acadêmica usou os três primeiros pedidos para testar montagem, maceração e agitação. O protótipo atual amplia o balcão para **nove atendimentos**. Inclui o Ato I, o Ato II e o pedido ambiental do Homem Alongado, no Ato III. Quem joga monta, macera, agita ou mexe a bebida, identifica a pista de cada evento, recolhe o ingrediente e serve o cliente. A pia permite repetir uma receita recusada.

O salto do Homem Encharcado para o Homem Alongado preserva o pedido corporal da Dama Pálida para outra etapa. A amostra termina com o Martini com aranha. O jogo usa primitivas geométricas. A direção visual futura e os critérios para validação humana estão no [moodboard](moodboard/index.html) e no [plano de testes](plano-de-testes.md).
