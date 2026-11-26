# Catálogo de assets (v2)

Todos os modelos são gerados **por código no Blender** (`art/blender/`), sem arquivos baixados. Para regenerar: `art/gerar_modelos.sh` (roda no Windows `simaonote` e copia para `public/models/`). Detalhes do pipeline em [art/README.md](../../art/README.md).

Convenção de eixos: jogo em Y para cima, jogador olhando para -Z. Cada modelo usa o referencial do objeto que substitui em `src/lab/bar.ts`. Os nomes de material comandam ajustes no Three.js (`src/lab/assets.ts`): `vidro_*`, `liquido_*`, `vidro_ambar*`, `filamento`, `cupula_tecido`, `vidro_janela`, `sombra*`, `piso`.

## `public/models/cenario/` (sala e móveis)

| Arquivo | O que é | Script |
|---|---|---|
| `sala.glb` | Piso de mármore xadrez, lambri, papel de parede listrado, sancas, vigas, palco do piano | `build_salao.py` |
| `balcao.glb` | Tampo de nogueira, apoio de couro, almofadas, trilho de latão, tapete de borracha, abas do posto | `build_balcao.py` |
| `estante.glb` | Armário com portas, colunas, espelhos, cornija, prateleiras com grade de latão (fileiras em y 1.06 / 1.5 / 1.94) | `build_salao.py` |
| `luminaria.glb` | Pendente com cúpula âmbar, lâmpada de filamento, cabo de 2 m | `build_balcao.py` |
| `banqueta.glb` | Banqueta de couro e latão (assento a 0,815 m) | `build_salao.py` |
| `mesa.glb` | Mesa redonda com pé de ferro e abajur plissado | `build_salao.py` |
| `cadeira.glb` | Cadeira de madeira curvada (olha para -Z) | `build_salao.py` |
| `cabine.glb` | Cabine de veludo capitonê com mesa e arandela | `build_salao.py` |
| `piano.glb` | Piano de cauda (52 teclas, tampa aberta) e banco | `build_salao.py` |
| `porta.glb` | Nós `porta_moldura` e `porta_folha` (origem na dobradiça) | `build_salao.py` |
| `janela.glb` | Janela com vidro noturno, peitoril e cortinas | `build_salao.py` |
| `relogio.glb` | Relógio de parede com mostrador romano (ponteiros ficam no código) | `build_salao.py` |

## `public/models/props/`

| Arquivo | Nós | Script |
|---|---|---|
| `copos.glb` | `copo_highball`, `copo_rocks`, `copo_coupe`, `copo_caneca` | `build_balcao.py` |
| `garrafas.glb` | `garrafa_<id>` para as 15 bebidas engarrafadas (ids do domínio: `rum`, `cachaca`, `whisky`, `tequila`, `gin`, `vodka`, `orange_liqueur`, `campari`, `sweet_vermouth`, `dry_vermouth`, `cola`, `soda_water`, `ginger_beer`, `lemon_juice`, `sugar_syrup`) com rótulos fictícios | `build_balcao.py` |
| `utensilios.glb` | Objetos de jogo do posto do bartender (nós de topo, origem = origem do objeto em `src/scene/station.ts`): `coqueteleira`, `coqueteleira_tampa`, `colher`, `macerador`, `pote` + `pote_limao_conteudo` / `pote_hortela_conteudo` / `pote_acucar_conteudo`, `porcao_limao`, `porcao_gelo` (material `vidro_gelo`), `porcao_hortela`, `cuba_gelo`, `pia`, `bandeja`, `suporte_copos`, `atril`, `livro` (páginas em material `papel`), `gaveta`, `alicate`, `pinca`, `faca`, `barata` (filhos `barata_perna_0..5`), `aranha` (filhos `aranha_perna_0..7`), `lesma`, `gosma` (material `gosma`, translúcido), `mao_cliente` (porcelana do estilo Máscara). 1,1 MB, < 4,1 mil triângulos por objeto. Folha de conferência: [estilos/utensilios_v2.png](estilos/utensilios_v2.png) | `build_utensilios.py` |

## `public/models/pessoas/` (estilo Máscara, aprovado)

Pés no chão, de frente para -Z. `sentado` = quadril a 0,46 m, para as cadeiras das mesas.

| Arquivo | Cliente | Ato | Pose |
|---|---|---|---|
| `mascara_executivo.glb` | 1 Executivo (Cuba Libre) | I | em pé |
| `mascara_turista.glb` | 2 Turista (Caipirinha) | I | sentada |
| `mascara_aposentado.glb` | 3 Aposentado (Whiskey Sour) | I | sentado |
| `mascara_festeira.glb` | 4 Festeira (Margarita) | I | em pé |
| `mascara_cavalheiro.glb` | 5 Cavalheiro (Negroni com barata) | II | em pé |
| `mascara_universitario.glb` | 6 Universitário (Mojito) | II | sentado |
| `mascara_detetive.glb` | 7 Detetive (Dry Martini), **dois rostos** | II | em pé |
| `mascara_encharcado.glb` | 8 Homem Encharcado (Moscow Mule com gosma) | II | em pé |
| `mascara_dama.glb` | 9 Dama Pálida (Bloody Mary com sangue) | III | em pé |
| `mascara_alongado.glb` | 10 Homem Alongado (Martini com aranha) | III | em pé, 2,3 m |
| `mascara_desavisada.glb` | 11 Desavisada (Gin-tônica) | III | em pé |
| `mascara_cego.glb` | 12 Cego (Dry Martini com olho) | III | em pé |
| `mascara_semrosto.glb` | 13 Sem-Rosto (Old Fashioned com orelha) | IV | em pé |
| `mascara_sorridente.glb` | 14 Sorridente (Daiquiri com dentes) | IV | em pé |
| `mascara_proprietario.glb` | 15 Proprietário (Black Russian com dedo) | IV | em pé |
| `mascara_pianista.glb` | Pianista (sempre de costas) | todos | sentado |

Ficha de cada personagem: [personagens_mascara_v1.md](personagens_mascara_v1.md). Para gerar uma pessoa: `art/gerar_modelos.sh mascaras <id>`.

## `public/models/experimentos/` (não usar no jogo)

Estilos de pessoa testados e recusados, guardados pelo acervo: `pessoa_realista`, `pessoa_cera`, `pessoa_marionete` (v1) e `pessoa_sombra`, `pessoa_deco`, `pessoa_mascara` (v2). Este último aparece no laboratório como "estranho de olhos-buraco" para contraste.
