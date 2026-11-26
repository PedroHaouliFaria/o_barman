# Spirits & Spirits · Visão da v2 (redesign)

Documento vivo da reconstrução do jogo. Versões antigas vão para `docs/v2/historico/`; nada é sobrescrito.

## 1. Decisões tomadas

| Data | Decisão | Motivo |
|---|---|---|
| 26/11/2026 | **Stack: React Three Fiber + @react-three/xr + Rapier + Vite + TypeScript** (WebXR). 100% código, sem Unity. | Abre por link no Meta Quest 3 e no desktop, Three.js de verdade (glTF/.glb do Blender, luz baked, pós-processamento, áudio 3D). |
| 26/11/2026 | **Lógica e mecânicas ficam como estão por enquanto.** `public/js/domain/` (game, preparation, menu) e seus testes são portados quase sem mudança. | Primeiro refazer visual, som e sensação; regras mudam depois. |
| 26/11/2026 | **Redesenhar tudo visualmente:** bar, estilo de arte, personagens. | A cena atual é greybox de primitivas. |
| 26/11/2026 | **O pianista é a trilha sonora do jogo** (ver seção 3). | Ideia do Felipe. |

## 2. Stack técnica

- **Vite + TypeScript + React** como base, build estático (continua servível por qualquer HTTPS, inclusive Caddy).
- **@react-three/fiber + drei**: cena, carregamento de `.glb`, texturas KTX2, ambiente.
- **@react-three/xr**: sessão WebXR, controles e rastreamento de mãos do Quest 3.
- **@react-three/rapier**: física (pegar, soltar, arremessar, quicar).
- **@react-three/postprocessing**: grão, vinheta, cor por ato (com cuidado com custo no Quest).
- **Áudio**: Web Audio com `PositionalAudio` do Three.js; piano por samples + MIDI.
- **Arte**: Blender → `.glb` com luz baked, texturas comprimidas. Render e bake pesados rodam no Windows.
- **Testes**: Vitest para o domínio (porta dos testes atuais) + Playwright para fluxo no navegador.

## 3. O pianista (trilha sonora viva)

Nas palavras do Felipe (26/11/2026):

> "Vai ter um pianista no fundo que vai ficar lá, de costas, tocando um piano normal. Conforme as coisas estranhas vão acontecendo e vai piorando, a música vai mudando, vai acompanhando sempre. Ou seja, vai ser a trilha sonora do jogo e vai ter o cara lá tocando. O visual dele vai mudando ao longo da noite também."

Regras de design:
- **Fonte diegética única de música.** Não existe trilha "de fora"; toda música sai do piano, posicionada em 3D no fundo do bar.
- **De costas, sempre.** O jogador nunca vê o rosto dele (pelo menos até o final).
- **A música acompanha o estado da noite**, não só o relógio: atos, eventos estranhos e (no futuro) consequências.
- **O visual dele muda ao longo da noite**, em paralelo à música.

Proposta de implementação (a validar):
- Piano por **samples de piano real** tocando **partituras MIDI**, com parâmetros que "adoecem" a execução: afinação (detune por nota), andamento (rubato/arrasto), notas omitidas, dissonâncias, reverb.
- Uma peça/variação por ato, com transição musical quando o ato muda (o pianista "emenda" na próxima peça, não um corte seco).
- Animação do pianista sincronizada às notas (mãos/ombros), para parecer que é ele mesmo tocando.

Rascunho de progressão (a definir com o Felipe):

| Ato | Hora | Música | Pianista |
|---|---|---|---|
| I · Normalidade | 22h–23h | Balada de jazz quente, bem tocada. | Terno arrumado, postura elegante. |
| II · Primeira anomalia | 23h–00h | Leve desafinação, andamento arrastando. | Algo levemente fora: postura curvada, terno amassado. |
| III · Algo está errado | 00h–01h | Notas faltando, dissonância, frases que se repetem. | Membros um pouco longos demais, movimento irregular. |
| IV · Degradação | 01h–02h | Piano quase irreconhecível, fragmentos, silêncios. | Visual claramente não-humano. |
| Epílogo | 02h | Silêncio ou uma última nota no contrato. | A definir. |

## 4. Consequências corporais: literais, com visual incrível e animação

Nas palavras do Felipe (26/11/2026):

> "basicamente tirou a orelha, para de ouvir do lado da orelha no fone; tirou o olho, para de ver daquele olho. entenda que tudo com um visual incrível e animação"

Isso **substitui** a versão "suavizada" do devlog (6.5), que pedia máscara nos dois olhos "sem apagar um display inteiro". Agora a perda é real e do lado certo:

| Sacrifício | Efeito persistente (v2) | Como fazer em WebXR |
|---|---|---|
| Sangue (9) | Batimento cardíaco audível e vinheta pulsando com ele | Pós-processamento + loop de áudio sincronizado |
| Olho (12) | **Um olho do headset fica escuro** (o lado escolhido/tirado) | Renderização por olho: camadas do Three.js (layer só do olho esquerdo/direito) com um "fechamento" animado na lente daquele olho |
| Orelha (13) | **Para de ouvir daquele lado** no fone/alto-falante do Quest | Web Audio: separar canais e zerar o lado perdido no mix final (inclusive o piano e as vozes) |
| Dentes (14) | Respiração e voz do próprio jogador alteradas | Sons de respiração/vocalização do protagonista com filtro |
| Dedo (15) | A mão virtual passa a ter um dedo a menos, em todas as animações | Variante do modelo da mão (controle e hand tracking) |

Regras:
- **Cada sacrifício é um momento**, com animação própria (não um corte seco): o objeto ritual, o gesto, a parte do corpo virando um ingrediente estilizado, e o efeito se instalando aos poucos (ex.: a visão daquele olho se fechando como uma pálpebra).
- As perdas **se acumulam até o fim** e aparecem no epílogo ("a visão escurece mantendo as limitações anteriores").
- Informação essencial nunca depende só do olho ou da orelha perdidos (legendas e dicas continuam visíveis/audíveis).
- **Conforto:** manter uma opção que troca o olho apagado por uma versão parcial, para quem sentir desconforto. A apresentação padrão é a literal.

## 5. Levantamento: o que já está documentado sobre a noite (26/11/2026)

Fontes: `docs/ficha-do-projeto.md`, `docs/planejamento.md`, `docs/moodboard/index.html`, `public/js/domain/menu.js`.

### Documentado
- **Premissa:** bartender num bar que cobra um preço cada vez mais pessoal; quanto melhor cumpre o turno, menos humano se torna.
- **Arco em 4 atos + epílogo, 15 pedidos, 22h às 02h:**
  - I · Normalidade (22h–23h): Executivo, Turista, Aposentado, Festeira.
  - II · Primeira anomalia (23h–00h): Cavalheiro (barata), Universitário, Detetive, Homem Encharcado (gosma).
  - III · Algo está errado (00h–01h): Dama Pálida (pedido 9, corporal, ainda sem detalhe), Homem Alongado (aranha), sangue fictício, Desavisada (gin-tônica), Cego (exige o olho do avatar).
  - IV · Degradação (01h–02h): Sem-Rosto (orelha), Sorridente (dentes), Proprietário (dedo).
- **Endgame:** após o 15º pedido o bar fecha, o protagonista assina um contrato, o contrato entra em combustão, a morte é fade + áudio com câmera estável, e uma cutscene leva aos créditos. A placa FECHADO é uma possibilidade.
- **Mecânicas previstas:** 15 receitas, 3 eventos ambientais recuperáveis, 5 consequências persistentes, técnicas montar/macerar/mexer/agitar, opções de conforto.
- **Luz por ato (moodboard):** âmbar/creme → oliva/nogueira → estanho/vinho → carvão/cinza rosado. Quinas da sala somem primeiro; no Ato IV rosto e porta afundam no escuro, mas aros dos copos e legendas ficam legíveis.
- **Som por ato (moodboard):** jazz baixo e gelo nítido (I); ruído à esquerda anunciando a barata (II); batimento discreto (III); silêncio que abre espaço para a voz do Proprietário e o ruído da pena (IV). Referência: sons ficando difíceis de localizar.
- **Referências:** Manet (Bar aux Folies-Bergère), Van Gogh (Café à noite), Kalf (natureza-morta), Redon (Aranha sorridente), VA-11 HALL-A (ritmo de atendimento), The Lighthouse (tensão do último ato).

### Não documentado / em aberto
- ~~Devlog com o roteiro completo~~ → recebido em 26/11 e salvo na raiz do repo.
- **As 5 consequências persistentes:** quais são exatamente, como aparecem no corpo/visão/audição do jogador e como ficam confortáveis em VR.
- **Como os sacrifícios corporais funcionam como interação** (olho, orelha, dentes, dedo): só existe a diretriz de serem "abstratos" e não impedirem de continuar.
- **O que acontece se o jogador se recusar ou errar muito:** não há escolha, final alternativo nem derrota.
- **Quem é o Proprietário, o que é o contrato, o que o jogador entende no final.**
- **Conteúdo da cutscene final** (marcado como "em aberto").
- **O pianista** (agora registrado acima) e qualquer outro elemento recorrente do bar.
- **Direção de arte definitiva:** o moodboard dá luz e referências, mas não o estilo de desenho dos modelos e personagens.
