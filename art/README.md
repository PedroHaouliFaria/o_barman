# Arte por código (Blender)

Todos os assets do jogo são gerados por scripts Python no Blender: modelos, texturas (madeira, couro, borracha) e rótulos. Nada é baixado de fora. As marcas dos rótulos são fictícias.

| Script | Gera |
|---|---|
| `blender/build_balcao.py` | `luminaria.glb`, `balcao.glb`, `copos.glb`, `garrafas.glb` (as 15 bebidas engarrafadas do jogo) |
| `blender/lib.py` | torno (perfis girados), caixas chanfradas, tubos, UV em escala de metro, bake na GPU, exportação glTF |
| `blender/materials.py` | nogueira envernizada em tábuas, couro, tapete de borracha (nós procedurais assados em textura) |
| `blender/labels.py` | rótulos renderizados com texto e filetes (fontes Georgia/Bodoni do Windows) |

## Como gerar

O pesado (bake na GPU) roda no Windows (`simaonote`, Blender 5.3 com RTX 4070):

```sh
COPYFILE_DISABLE=1 tar czf - art/blender | ssh simaonote "tar xzf - -C C:/barman"
ssh simaonote "& 'C:\Program Files\Blender Foundation\Blender 5.3\blender.exe' -b -P C:/barman/art/blender/build_balcao.py -- C:/barman/out"
scp "simaonote:C:/barman/out/*.glb" public/models/
```

Em qualquer máquina com Blender 4.2+ funciona igual: `blender -b -P art/blender/build_balcao.py -- <pasta>`.

Convenção: o jogo usa Y para cima e o jogador olha para -Z; no Blender um ponto (x, y, z) do jogo fica em (x, -z, y) (`lib.game()`). Os nomes de material comandam o ajuste no Three.js (`src/lab/assets.ts`): `vidro_*`, `liquido_*`, `vidro_ambar`, `filamento`.
