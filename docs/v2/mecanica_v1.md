# Mecânica v1 · On the House jogável no bar novo (26/11/2026)

Frente da mecânica, branch `claude/mecanica-60d8eb`. Pedido do Felipe: levar as mecânicas existentes para o jogo novo (bar Âmbar Noturno, pessoas Máscara), deixar tudo jogável de verdade, aproximar as coisas, refazer a UI do zero. Referência das mecânicas: [relatório da equipe](equipe/relatorio_mecanicas_v0.1.0.txt) (protótipo A-Frame, commit 827d239).

## O que mudou

### 1. A main da equipe entrou na v2
- Merge da `origin/main` (PR #1 do Pedro e do João). O código A-Frame deles foi para `legacy/aframe/`; as regras (copo começa vazio, é pego na prateleira) entraram direto em `src/domain`.
- Refeito na v2: copo escolhido na prateleira a cada cliente, gaveta de utensílios (alicate, pinça, faca) com fundo físico que leva o que está dentro, utensílios que ficam onde caem, avisos "Macerado / Mexido / Batido".

### 2. O jogo roda no bar Âmbar Noturno
- O cenário é o bar do laboratório (`src/lab/bar.ts`, opção `game`), com os modelos do Blender. O greybox virou só colisor invisível da física.
- **Estante 60 cm mais perto** (`SHELF_SHIFT`): no laboratório as garrafas ficavam a ~1,4 m, fora do alcance de quem está parado. Agora: complementos na frente do tampo de trás (z 0,5), alcoólicos atrás deles (z 0,74) e na primeira prateleira (z 0,83). Teste automático garante que toda garrafa fica a menos de 0,97 m da cabeça.
- Copos e garrafas são os modelos do Blender (`copos.glb`, `garrafas.glb`); os copos ampliados 15% para mirar melhor em VR. As medidas dos gestos (boca, fundo, raio) vêm de [glass-shapes.js](../../src/scene/glass-shapes.js); a boca de cada garrafa é medida no modelo.
- Clientes Máscara, um por pedido; os sentados (Turista, Aposentado, Universitário) esperam à mesa e vêm sentar numa banqueta do balcão na vez deles.
- **26 objetos novos no Blender** no mesmo estilo (`utensilios.glb`, script `art/blender/build_utensilios.py`): coqueteleira e tampa, colher bailarina, macerador, potes com limão, hortelã e açúcar, porções, cuba de gelo, pia, bandeja, prateleira de copos, atril e livro, gaveta, alicate, pinça, faca, barata, aranha, lesma, gosma e a mão de porcelana do cliente. Folha: [estilos/utensilios_v2.png](estilos/utensilios_v2.png).
- A lesma saiu de dentro do armário (agora anda no chão junto a ele, colhida apontando e apertando o gatilho); a barata está na face interna do balcão novo.

### 3. UI redesenhada do zero (nada da UI antiga)
- **No bar (diegética)**, em [src/ui/world-ui.ts](../../src/ui/world-ui.ts): comanda de papel espetada num suporte de latão (número, hora, cliente, drinque, copo, carimbo "Devolvido"); fala do cliente como legenda de cinema ao lado do rosto; plaquetas de latão gravado (pia, gelo, entrega, copos, garrafas); rótulos de papel nos potes e no pote de gorjetas; medalhões de latão esmaltado para abrir/pausar e altura; livro de receitas impresso; etiqueta de papel pendurada no recipiente em mãos; palavra dourada que sobe e some ("+1 Rum", "Mexido").
- **No navegador**: tela de abertura (Cinzel + Cormorant Garamond, fontes empacotadas), topo mínimo sem barra, aviso flutuante que esmaece, Caderno como caderno de couro com páginas de papel.

### 4. Jogabilidade (boas práticas de VR aplicadas)
- **Pouso assistido**: soltar devagar copo, coqueteleira ou garrafa logo acima de uma bancada ou prateleira o assenta em pé ali; soltar em movimento continua sendo arremesso. Antes o copo tombava na borda e rolava para o chão.
- **Sem sobreposição**: ao pousar, o objeto se afasta do vizinho (duas garrafas no mesmo lugar faziam a física "explodir" a do lado).
- **Garrafas não atravessam mais a prateleira**: corpos criados "dormindo" no Rapier não geravam contato e caíam pela tábua assim que algo era arremessado (achado no ensaio de VR; teste novo em `tests/throw-physics.test.js`).
- **Mira mais limpa**: com algo na mão, as outras garrafas não são alvo (o clique atravessa a fileira da frente até a plaqueta de trás).
- **Folga nos gestos**: mexer e macerar contam 1,5 cm além da borda interna do copo.
- **Perfil de desempenho do Quest**: no VR, sem sombras, vidro sem passe de transmissão e só as luzes que contam (pendentes, luz de trabalho, piano). `?leve` aplica o mesmo no computador.

Capturas do jogo jogado pelo ensaio automático (um quadro por pedido aprovado): [estilos/jogo_v1/](estilos/jogo_v1/).

## Como foi testado

| Ensaio | Resultado |
|---|---|
| `npm test` (regras, gestos, física, alcance das garrafas) | 37 testes passam |
| `npm run typecheck` | ok |
| `npm run test:browser` | os 9 pedidos pelos objetos 3D com mouse e tecla E (copo na prateleira, doses, porções, colher de açúcar, macerar, mexer, tampa, agitar, despejar, bichos, entrega na mão), arremesso com Q, reinício e os 9 de novo pelo Caderno |
| `npm run test:xr` | Quest 3 simulado: os 9 pedidos só com gestos dos controles (pegar o copo na prateleira e pousar, inclinar garrafa e devolver à estante, soltar porções, colherada, duas batidas do macerador, volta da colher, tampa, despejar da coqueteleira, barata, gosma, aranha na descida, servir na mão) |

Limite do simulador: sem GPU ele roda a ~6 quadros por segundo, lento demais para o gesto de agitar (que exige quadros de até 120 ms); o ensaio usa a alternativa do gatilho e avisa no log. O gesto de agitar é coberto pelos testes de `motion.js`.

## O que ainda depende do Quest físico
- Conforto e alcance reais: estante a 0,5–0,85 m atrás, prateleira de copos e mão do cliente a ~0,9–1,2 m à frente (há seleção por raio para o que fica longe).
- Desempenho: o bar tem ~680 chamadas de desenho e ~300 mil triângulos por quadro. No Quest 3 isso está no limite; o próximo passo é juntar a geometria estática do salão por material e medir no aparelho.
- Legibilidade da comanda e das plaquetas no visor (tamanhos pensados para ~1,5° de altura de texto).
- Pegada real dos controles e da pinça com as mãos (o simulador tem uma pegada inclinada diferente).

## Pendências e decisões para o Felipe
- Pernas articuladas dos insetos arremessados (existiam no A-Frame) ainda não foram portadas para o Rapier.
- O casal da cabine do fundo e alguns manequins do laboratório ainda não são Máscara (fora do alcance do jogador).
- A Detetive não vira de costas no jogo (o laboratório tem esse ciclo).
- Música do pianista do laboratório ainda não toca no jogo.
