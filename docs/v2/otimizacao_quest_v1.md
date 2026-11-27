# Otimização para o Quest 3 de verdade (v1) · 27/11/2026

## O problema

O Felipe testou o link no Quest 3 e o jogo travou: "travadissimo, nao consigo nem mexer a mao direito, e so de estar com a aba aberta, ele como um todo ja trava".

O navegador não era a causa. A causa era o custo da luz em tempo real, que o chip de celular do Quest não aguenta (na RTX do PC e no simulador do Mac isso não aparecia):

| Custo por quadro (antes) | Por quê |
|---|---|
| ~14 desenhos extras do bar inteiro | 4 luzes com sombra: as 2 luminárias com sombra (6 faces de cubo cada), o refletor do piano e a luz da porta |
| +1 desenho do bar | vidro com refração (transmission) |
| 14 luzes calculadas em cada pixel | luminárias, velas, arandelas, refletores, ambiente e hemisfério |
| 1,56x mais pixels | resolução de 1,25x da recomendada, sem foveação |
| bloom de 8 níveis a partir da resolução cheia | por olho |
| aba 2D já pesada | fora do VR a página desenhava o bar com sombras e efeitos atrás do menu |

## O que o Felipe decidiu (palavras dele em [HISTORICO.md](HISTORICO.md))

- Sombras: "podemos remoevr ou abaixar bem a sombra" (mostrando antes).
- Refração: "isso e desnecessario, nao preciamos".
- Resolução: "absurdo isso, podemos reduzir".
- Luz assada no Blender: "sim, vamos fazer isso [...] me mostre como fica antes".
- Rodar no Windows e transmitir: "nao farei isso".
- O que importa: "a atmosfera como um todo, o brihlo baixo e as luzes bonitas, mas nao me importa tando o copo qualidade, os objetos qualidade".

## O que mudou

### 1. Luz assada (lightmap)

A iluminação do bar é calculada uma vez no Blender (Cycles na RTX 4070 do Windows: 4096 × 4096 px, 1024 amostras, 3 rebatidas de luz, cerca de 35 s) e gravada numa textura. No jogo, tudo o que é fixo (sala, balcão, estante, mesas, cabines, piano, rótulos) vira material sem cálculo de luz: cor × textura × luz assada.

- Mesmas 11 luzes do jogo, com as mesmas cores e intensidades (P = 4π·I no Blender dá a mesma irradiância do Three.js; conferido num teste de calibração).
- Luzes sem sombra no jogo (velas, arandelas, 3ª luminária) também ficam sem sombra no Blender; senão a própria arandela apaga a luz dela.
- Fundo céu/chão igual à luz de hemisfério + ambiente do jogo.
- De bônus, a luz rebatida (que o tempo real não faz) e as sombras macias de todas as luzes com sombra.
- Fica em tempo real só o que se mexe (pessoas, copos, garrafas, mãos, utensílios): 3 luminárias do balcão, refletor do piano e luz da porta, todas sem sombra. Atos: a luz assada escurece 10% (ato 2) e 20% (ato 3), como o ambiente.
- Ficam de fora da luz assada, com material normal: vidro, líquidos, metais (latão), coisas que brilham (cúpulas, lâmpadas, janela, placa de saída) e as pessoas.

Arquivos: `src/scene/baked-light.ts`, `scripts/export-bake.js`, `art/blender/bake_luz.py`, `art/gerar_luz.sh`, `public/models/luz/bar_luz.{glb,jpg,json}` (3 MB no total).

**Quando o bar mudar** (móvel novo, luz nova), é preciso assar de novo: `art/gerar_luz.sh` (com o servidor em 5180). Se esquecer, o jogo percebe que os materiais não batem, avisa no console e volta para a luz em tempo real sozinho.

### 2. Perfil Quest (`src/app/device.ts`)

Ativado sozinho no navegador do Quest (ou `?quest` no computador):

- luz assada, sem sombras em tempo real e sem refração no vidro;
- resolução por olho de 1x, a recomendada pelo Quest (antes era 1,25x, 56% mais pixels), com foveação leve (0,5) nas bordas;
- bloom com a mesma receita, mas partindo de meia resolução e com 6 níveis (antes 8 na resolução cheia). Vinheta, grão e ACES iguais;
- aba 2D (menu antes de entrar no VR): desenho simples, sem pós-processamento, densidade de pixels 1x;
- pessoas paradas (pianista e pessoas das mesas) com as peças de mesmo material juntadas: mesmo visual, menos chamadas de desenho.

### Números (cena no simulador, por olho)

| | Antes | Agora (Quest) |
|---|---|---|
| Desenhos extras de sombra | ~14 do bar inteiro | 0 |
| Refração | +1 desenho do bar | 0 |
| Luzes em tempo real | 14 em todos os pixels | 7, e só nos objetos que se mexem |
| Objetos desenhados | ~470 (+ sombras) | ~266 |
| Pixels por olho | 1,56x | 1x, com foveação |

## Opções de teste no Quest

- `?tempo-real`: volta a luz em tempo real (para comparar).
- `?semefeitos`: tira o pós-processamento (bloom, vinheta, grão) e desenha direto no headset. Se ficar fluido só assim, o pós é o próximo gargalo.
- `?assada`: luz assada no computador (para ver como fica).

## Comparações

`estilos/luz_assada_v1/`: as mesmas vistas com a luz em tempo real (`*_tempo_real.png`) e assada (`*_assada_v1.png`, primeiro teste em 2048 px, antes de corrigir as arandelas; a versão final é a que está no jogo).

## Ainda falta

- Medir no Quest de verdade (quadros por segundo). Para isso: modo de desenvolvedor + cabo + `chrome://inspect` no Chrome do Mac.
- Sombras de contato embaixo das pessoas e copos (hoje os objetos que se mexem não fazem sombra no balcão).
