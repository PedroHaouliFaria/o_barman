# Otimização e atmosfera v1 (26/11/2026)

Regra do Felipe: **atmosfera é o mais importante para a imersão; luz e áudio não entram em economia.** Toda otimização abaixo foi aceita só se o visual fica igual.

## Feito

| O quê | Efeito | Visual |
|---|---|---|
| Geometria fixa juntada por material ([merge-static.ts](../../src/scene/merge-static.ts)) | malhas 1.193 → 468; chamadas de desenho (computador, com sombras) ~4.800 → ~2.300; sem sombras ~760 → ~325 | idêntico: [antes](estilos/otimizacao_v1/salao_antes.png) e [depois](estilos/otimizacao_v1/salao_depois.png) |
| Luz completa do laboratório no jogo | todas as luzes, sombras e vidro âmbar no computador e no Quest | [laboratório](estilos/otimizacao_v1/lab_bartender.png) e [jogo](estilos/otimizacao_v1/jogo_bartender.png) |
| Câmera do Âmbar Noturno no computador | bloom, vinheta, grão e ACES iguais ao laboratório | idem |
| **Pós-processamento próprio no VR** ([xr-post.ts](../../src/app/xr-post.ts)): a mesma receita do computador (luminância 0,75/0,2, mipmap blur de 8 níveis com raio 0,85, bloom 0,9 em screen, vinheta 0,75/0,25, grão 0,06, ACES), olho por olho | o EffectComposer não roda em WebXR; agora o VR tem a mesma luz do computador | [VR v3](estilos/otimizacao_v1/vr_luz_v3.png), [computador](estilos/otimizacao_v1/jogo_bartender_v2.png) |
| Mãos do jogador de porcelana (estilo Máscara) | trocam as esferas de bloco | conferir o ângulo da pegada no Quest |
| Sombras no Quest em 1024 px (iguais ao computador) | revertido o corte para 512 | igual |
| Quest sem foveação e em 1,25x da resolução recomendada | nitidez em toda a visão; custa ~56% mais pixels | igual ao computador |
| Grão no espaço de exibição e vinheta por olho | no VR o grão em luz linear deixava os pretos cinza | [VR v4](estilos/otimizacao_v1/vr_luz_v4.png) |
| Saiu a luz de trabalho branca | era ela que deixava a cúpula branca e a cena "de escritório" | — |
| Piano e murmúrio do salão | áudio posicional, sala, música que piora a cada ato | — |

## Testado e recusado (ficou feio)
- **Desligar velas e arandelas no Quest**: o salão perde a parede vermelha iluminada. [Imagem](estilos/otimizacao_v1/salao_sem_luzes_RECUSADO.png).
- **"Poças de luz" pintadas** no lugar dessas luzes: chapadas, bege, sem o calor da luz real.
- **Vinheta presa à cabeça no VR**: aparece como um trapézio escuro. [Imagem](estilos/otimizacao_v1/vr_vinheta_RECUSADA.png).
- **Halos, névoa e cones de luz falsos no VR**: deixaram a cena lavada, com contorno escuro em volta da luz e a lâmpada aparecendo por dentro (Felipe: "literalmente outro jogo"). [Imagem](estilos/otimizacao_v1/vr_halos_RECUSADO.png). Trocados pelo pós-processamento de verdade.

## Não aplicado, e por quê
- **Os dois olhos numa passada (multiview)**: o renderizador WebGL do Three.js 0.187 não tem; só o WebGPU, que o navegador do Quest ainda não usa em VR.
- **Texturas KTX2**: ganha memória e download, mas a compressão pode borrar madeira e rótulos. Só vale com o modo de alta qualidade (UASTC) e depois de medir no Quest.
- **Resolução adaptativa**: reduz a nitidez quando o quadro atrasa; só se a medição no Quest pedir.

## Custo no Quest
O pós-processamento no VR é a parte mais cara: a cena é desenhada numa imagem intermediária (MSAA 4x) e passa por ~17 filtros por quadro. Decisão do Felipe: a luz vem antes do desempenho. Se o Quest não segurar 72 quadros por segundo, o primeiro ajuste sem mudar o visual é reduzir a resolução só dos níveis do bloom.

## Risco que sobra
- Com toda a luz e as sombras, o Quest pode ficar abaixo de 72 quadros por segundo. Medir no aparelho. Se faltar desempenho, o caminho que **não piora o visual** é assar a luz no Blender (lightmaps com a RTX do Windows): as poças de luz, as sombras suaves e o calor das paredes ficam pintados na textura com qualidade de cinema, e o Quest só desenha.
