# Experiência do jogador (v1) · 27/11/2026

Pedidos do Felipe depois de jogar no Quest 3 de verdade (palavras dele em [HISTORICO.md](HISTORICO.md)).

## O que mudou

| Pedido | O que foi feito | Onde |
|---|---|---|
| Mão invertida | O modelo é uma mão direita (a esquerda é o espelho). O giro no controle estava ao contrário: palma para fora e polegar para baixo, então cada mão parecia a do outro lado. Agora a palma fica virada para dentro e o polegar para cima, como quem segura o controle. | `src/interaction/controls.ts` (`dressHands`) |
| "batido", "mexido", "macerado" não aparecem | A palavra dourada que sobe agora é maior e dura 2,4 s. Um **selo fixo** fica pairando sobre o copo ou a coqueteleira depois da técnica, mesmo com o recipiente pousado. Durante o gesto, um **anel dourado** em volta do recipiente enche até completar. Além disso, todos os avisos de texto agora aparecem **dentro do VR** (antes ficavam no HTML, que some no óculos). | `src/scene/vessel-feedback.ts`, `src/scene/station.ts` |
| Copo errado → reclamação de gosto | As reclamações agora seguem o tipo do erro: **copo** ("Que copo é esse? Eu nem encosto a boca nessa taça."), **ingredientes** (as de gosto, como antes) e **preparo**. Como no protótipo da equipe, o cliente diz o que está errado sem dar a resposta. | `src/domain/game.js`, `drinkProblem` em `src/domain/preparation.js`, teste DOM-14 |
| Sons do bar | **Conversa das mesas**: vozes em português geradas por voz sintética (Kokoro, no Windows), cada mesa com sua conversa, em áudio posicional ([audio_conversa_v1.md](audio_conversa_v1.md)). **Foley** sintetizado por código: gelo batendo na coqueteleira (um golpe por chacoalhada), colher no vidro (um "tim" por quarto de volta), pilão (baque e esmagado a cada pilada), líquido caindo enquanto serve, gelo no copo, limão/açúcar caindo, tampa de metal, água da pia, copo pousado, copo deslizando na entrega, batida seca no erro, sininho da porta, passos dos clientes, patinhas de barata e gosma. Os bipes antigos saíram. | `src/audio/foley.ts`, `src/audio/room.ts` |
| Cliente teleporta | Quem espera à mesa (Turista, Aposentado, Universitário) **levanta, anda até o balcão e senta na banqueta**; servido, volta para a mesa **com o drink na mão**. Os outros **entram pela porta dos fundos** (a porta abre, o sininho toca), atravessam o salão entre as mesas e param no balcão; servidos, saem pela porta com o drink. Passos sincronizados com o andar. A fala do pedido só aparece quando o cliente chega. | `src/scene/customer-flow.ts`, `src/scene/walkers.ts`; modelos em pé novos: `mascara_{turista,aposentado,universitario}_em_pe.glb` |
| Jogador andando | O bartender fica atrás do balcão: pode se abaixar e se inclinar até 30 cm do lugar; passou disso, o bar acompanha a cabeça e um aviso explica. | `holdPlace` em `src/scene/station.ts` |
| Pegar de longe | Em VR só se pega o que está a até 32 cm da mão. Mirando algo mais longe e apertando: aviso "Longe demais para pegar…", com "Abaixe-se e estique a mão" quando o objeto está abaixo do tampo, e uma vibração no controle. Placas, páginas e medalhões continuam funcionando à distância. | `REACH` e `tooFar` em `src/interaction/controls.ts` |
| Item arremessado para fora | Item do jogo que sai da área de alcance (por cima do balcão, no chão, longe nas laterais) volta para o lugar dele, com aviso e som. Os bichos dos eventos ficam de fora: jogá-los longe é descartá-los. | `returnStrays` em `src/interaction/controls.ts` |
| Lavar o copo, não trocar nem jogar fora | Copo devolvido ganha o selo "Devolvido · lave na pia" e a pia acende (moldura dourada pulsando + "Lave o copo aqui"). Tentar pegar outro copo com o sujo: aviso para lavar e a pia acende. Copo arremessado volta para a bancada com o aviso de lavar. O resultado de toda ação agora aparece também no VR. | `src/scene/station.ts` (`sinkHint`), `src/interaction/controls.ts`, `src/scene/vessel-feedback.ts` |
| Colher pega pela cabeça | Em VR a mão segura a **ponta do cabo** da colher e do macerador, não o meio. | `GRIPS` em `src/interaction/controls.ts` |
| Não macera com o copo na bancada | Mesma causa: segurando o macerador pelo meio, a cabeça mal descia abaixo da mão e não chegava ao fundo do copo pousado. Com a pegada no cabo, a cabeça fica 16 cm abaixo da mão. | idem |

## Em aberto

- Andar de boneco: os modelos não têm esqueleto. O andar é um deslizar com passinhos (sobe e desce, balança, tronco à frente). Pernas articuladas exigiriam refazer as pessoas com esqueleto no Blender.
