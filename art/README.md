# Arte por código (Blender)

Todos os assets do jogo são gerados por scripts Python no Blender: modelos, texturas (madeira, couro, borracha) e rótulos. Nada é baixado de fora. As marcas dos rótulos são fictícias.

| Script | Gera |
|---|---|
| `blender/build_balcao.py` | `luminaria.glb`, `balcao.glb`, `copos.glb`, `garrafas.glb` (as 15 bebidas engarrafadas do jogo) |
| `blender/build_salao.py` | `sala` (piso de mármore, lambri, papel de parede, sancas, vigas), `estante`, `banqueta`, `mesa` (com abajur), `cadeira` (madeira curvada), `cabine` (veludo capitonê + arandela), `piano` (cauda + banco), `porta` (moldura + folha), `janela` (com cortinas), `relogio` |
| `blender/build_pessoas.py` | rascunho de pessoas: o Executivo em 3 estilos (`pessoa_realista`, `pessoa_cera`, `pessoa_marionete`). Corpo e roupa por skin modifier, rosto esculpido por funções, olhos, cabelo, gravata |
| `blender/build_pessoas_v2.py` | estilos Sombra, Máscara e Déco (o Executivo) |
| `blender/build_mascaras.py` | estilo Máscara escolhido: pessoas normais com olhos pintados (`mascara_executivo`, `mascara_turista` sentada, `mascara_aposentado` sentado); expressão, cabelo, roupa e pose por parâmetros |
| `blender/figura.py` | utilitários de figura (skin modifier, prismas, torno) |
| `blender/lib.py` | torno (perfis girados), caixas chanfradas, tubos, UV em escala de metro, bake na GPU, exportação glTF |
| `blender/materials.py` | nogueira envernizada em tábuas, couro, tapete de borracha (nós procedurais assados em textura) |
| `blender/labels.py` | rótulos renderizados com texto e filetes (fontes Georgia/Bodoni do Windows) |

## Como gerar

O pesado (bake na GPU) roda no Windows (`simaonote`, Blender 5.3 com RTX 4070). Um comando faz tudo e copia para as pastas certas de `public/models/`:

```sh
art/gerar_modelos.sh                     # tudo
art/gerar_modelos.sh salao               # só sala e móveis
art/gerar_modelos.sh mascaras turista    # só uma pessoa
```

Catálogo completo dos modelos: [docs/v2/ASSETS.md](../docs/v2/ASSETS.md).

Em qualquer máquina com Blender 4.2+ funciona igual: `blender -b -P art/blender/build_balcao.py -- <pasta>`.

Convenção: o jogo usa Y para cima e o jogador olha para -Z; no Blender um ponto (x, y, z) do jogo fica em (x, -z, y) (`lib.game()`). Os nomes de material comandam o ajuste no Three.js (`src/lab/assets.ts`): `vidro_*`, `liquido_*`, `vidro_ambar`, `filamento`.
