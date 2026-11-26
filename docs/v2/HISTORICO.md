# Histórico da v2 · pedidos e mudanças

Cada fala do Felipe (com data), o que mudou e onde ficou. Nada se apaga; versões antigas de documentos vão para `docs/v2/historico/`.

## 26/11/2026

**Felipe:** "quero que voce clone esse repo e comecemos a melhorar MUITO esse projeto. entendeno o contexto de que estamos fazedno um jogo VR pra nossa turma de experiencias imersivas"
→ Repo clonado; diagnóstico: mecânica sólida, imersão ausente (luz, som, clientes estáticos, arco de terror não implementado, sem háptico).

**Felipe:** "temos total liberdade pra usar das melhores stacks pra fazer algo realmente imersivo e profissional e bom de jogar [...] vou querer desenhar o bar, criar um estilo de desenho bonito (redesesnhar TUDO) fazer os peresonagens, adicionar o piano la no fundo com musicas atmostfericas que com a noite vao ficando mudando"

**Felipe:** "vamos com isso, acho melhor [R3F + @react-three/xr + Rapier + Vite + TS] [...] adoro three js [...] noa mude a logica e a mecanica por enquanto, sem mudar demais. depois a gente vai mudando as coiasa. gosto da stack que seja 100% codigo, sem unnity."
→ Stack decidida. Registrado em [visao.md](visao.md), seções 1 e 2.

**Felipe (pianista):** "Vai ter um pianista no fundo que vai ficar lá, de costas, tocando um piano normal. Conforme as coisas estranhas vão acontecendo e vai piorando, a música vai mudando, vai acompanhando sempre. [...] O visual dele vai mudando ao longo da noite também."
→ Registrado em [visao.md](visao.md), seção 3.

**Felipe:** "me diga o que mais está e não está documentado sobre toda essa experiência de a noite ficando estranha"
→ Levantamento em [visao.md](visao.md), seção 5.

**Felipe:** "cria a nova branch sim como redesign visual"
→ Branch `feat/redesign-visual`.

**Felipe (consequências):** "basicamente tirou a orelha, para de ouvir do lado da orelha no fone; tirou o olho, para de ver daquele olho. entenda que tudo com um visual incrível e animação"
→ Regra nova em [visao.md](visao.md), seção 4. Substitui a versão suavizada do devlog 6.5.

**Felipe enviou o devlog e a conversa com o agente anterior** (curva de estranheza, 15 personagens; "gostei desses personagens").
→ Devlog original salvo em [DEVLOG_SPIRITS_AND_SPIRITS_CODEX.md](../../DEVLOG_SPIRITS_AND_SPIRITS_CODEX.md) (texto recuperado de erro de codificação, conteúdo intacto). Detalhes de personagens e curva em [personagens-e-curva.md](personagens-e-curva.md).

**Felipe:** "Sim, começa" (migrar o jogo para R3F com a mesma lógica e a cena atual)
→ Migração feita na branch `feat/redesign-visual`:
- Novo projeto Vite + TypeScript + React Three Fiber + @react-three/xr + Rapier (`src/`).
- Regras do jogo (`src/domain/`) e gestos (`src/interaction/motion.js`) copiados **sem mudança**; os 32 testes de regra passam.
- Cena, interações de mouse/teclado, controles e mãos do Quest e placas portadas 1:1 do A-Frame. Física de arremesso trocada de cannon-es para Rapier (as patas articuladas dos insetos ficaram para depois).
- Protótipo A-Frame preservado em `legacy/aframe/` (inclusive o README antigo). `npm run start:legacy` abre a versão antiga.
- Ensaios novos: `npm run test:browser` (9 pedidos, arremesso, reinício) e `npm run test:xr` (Quest 3 simulado pegando, soltando e despejando). `?xr-emulate` simula o Quest no navegador.
- `npm run dev:quest` serve HTTPS na rede local para abrir no headset.

**Felipe (26/11/2026):** "proponha 3 estilos. mas entenda que quero uma vibe meio eerie, 3d, quero que voce proponha alguns estilos ja tendo em mente e desenhando o bar como um todo, cena de bar realista, mesas no fundo pessoas convresando porta que abre la atras pianista tocando, tudo mais"
→ Laboratório de estilos (`estilos.html`, código em `src/lab/`): o bar inteiro em 3D, com salão, mesas, cabines, gente conversando, porta que abre com uma silhueta, pianista de costas, janelas, relógio e som 3D (piano, murmúrio, porta). Três estilos: Âmbar Noturno, Fita Perdida e Gravura.
→ Proposta, planta e imagens em [estilos_v1.md](estilos_v1.md) e [estilos/](estilos/). Recomendação: Âmbar Noturno como base, degradando para "fita" ao longo da noite.

**Felipe (26/11/2026), sobre a recomendação de "virar fita":** "isso podemos ir vendo ao longo, mas quero sempre manter o mesmo estilo"
**Felipe:** "eu com certeza preferi o âmbar noturno. ele se aproxima muito da vibe que eu quero de não descaradamente terror e sim super climatizado e ambientalizado. com certeza vamos com ele. mas entenda que eu ainda não gostei dos detalhes. tipo as pessoas, as garrafas, os objetos e os assets como um todo. mas sim, quero essa vibe âmbar noturno, seguindo com ela"
→ Decisão registrada em [visao.md](visao.md): Âmbar Noturno é o estilo do jogo inteiro, sem trocar de estilo ao longo da noite (a degradação por ato fica em aberto, "ir vendo ao longo"). Próximo foco: qualidade dos assets.
**Felipe:** "tem algum site interativo que você fez que eu posso abrir e ver com mais detalhes, tipo me mexendo?"
→ Laboratório ganhou andar livre (WASD/setas, Shift corre).

**Felipe (26/11/2026), com print da vista do bartender:** "entenda que o take que eu gosto é esse com a luz em cima assim. e mais ou menos assim com mais detalhes. e entenda nós NÃO VAMOS NOS MEXER, vamos ficar parados o JOGO INTEIRO"
→ Print salvo em [estilos/referencia_felipe_take_bartender_v1.webp](estilos/referencia_felipe_take_bartender_v1.webp). Decisão em [visao.md](visao.md): jogador fixo, esse enquadramento é a referência e recebe todo o detalhe. Laboratório: andar desligado (só com `?livre` para inspeção); olhar em volta continua.

**Felipe (26/11/2026):** "Blender por código + CC0" → depois: "sobre o cc0, vai de você, mas SIM quero SOMENTE código por blender"
→ Assets 100% gerados por código no Blender (modelos, texturas e rótulos), sem baixar nada de fora. Roda no Windows (simaonote).
**Felipe:** "quero que você já remova do localhost atual essa visão de teste de seleção e textos, quero apenas a ambientalização com o piano"
→ `estilos.html` mostra só o bar (Âmbar Noturno, vista do bartender); um clique liga o piano. Controles de teste só com `?debug`.
→ Primeiros assets por código ([art/README.md](../../art/README.md)): luminária (cúpula âmbar, lâmpada de filamento, latão), balcão (tampo de nogueira, apoio de couro, almofadas, trilho de latão, tapete), copos (highball, rocks, coupe, caneca de cobre) e 15 garrafas com rótulos fictícios. Gerados no Blender do Windows, em `public/models/`. Capturas em `estilos/assets_balcao_*_v1.jpg`. Ainda provisórios: pessoas, estante do fundo, salão.

**Felipe (26/11/2026), com prints:** "a estante de baixo ali tá bugada, quando a visão mexe, ela fica stuttering e travando. melhore isso. fora isso tá bom. além disso quero que você desça mais a lâmpada central pra aparecer melhor mesmo olhando reto [...] sim agora quero que você melhore a estante e salão e tudo mais de objeto e só depois fazemos as pessoas"
→ Prints salvos em `estilos/referencia_felipe_estante_bug_v1.webp` e `estilos/referencia_felipe_luminaria_v1.webp`.
→ Tremor da estante: era z-fighting (prateleira de baixo e tampo do armário na mesma altura). A estante virou um modelo único sem superfícies sobrepostas; a primeira fileira de garrafas pousa direto no tampo.
→ Luminária central desceu de 2,45 m para 2,05 m (cabo de 2 m atravessa o teto em qualquer altura).
→ Novo `art/blender/build_salao.py`: sala, estante, banquetas, mesas com abajur, cadeiras de madeira curvada, cabines de veludo capitonê com arandela, piano de cauda com banco, porta, janelas com cortinas e relógio com mostrador romano. Capturas em `estilos/assets_salao_*_v1.jpg`. Pessoas continuam provisórias (próximo passo).

**Felipe (26/11/2026):** "suba um pouco a luz, tá muito na cara. tá travando a parte de baixo da taça da mesa quando muda a câmera, igual na prateleira que tava. não deixe isso acontecer com nada. além disso quero que a visão pro pianista seja melhor e dê pra ver ele sem pessoas na frente. mas sim, agora vamos para as pessoas, tá muito bom"
→ Luminária central em 2,22 m (antes 2,05).
→ Tremor (z-fighting) evitado em tudo: objetos pousados ficam 2 mm acima da superfície; vidro desenhado só por fora (era dupla face, a base brigava com o tampo); câmera com near 0,05 m (mais precisão de profundidade).
→ Piano num palco de 26 cm no canto do fundo e mesas fora da linha de visão: o pianista aparece inteiro do posto do bartender (`estilos/assets_salao_pianista_v2.jpg`).
**Felipe:** "mas acalma, entenda que as pessoas vai ser sensível, preciso eu ver e ver se eu aprovo [...] quero ver diversos estilos [...] uma pessoa normal, uma pessoa estranha e algumas das pessoas reais do nosso manual. quero detalhes. [...] primeiro gere apenas 1 pessoa com detalhes pra cada estilo e depois vamos gerando mais."
→ Próximo: 1 pessoa (o Executivo) em 3 estilos, para aprovação antes de qualquer outra.
→ Rascunho v1 das pessoas (`art/blender/build_pessoas.py`): o Executivo em 3 estilos (realista pintado, cera de museu, marionete entalhada), lado a lado no balcão (`estilos.html?pessoas`). Imagens: `estilos/pessoas_executivo_3estilos_v1.jpg` e `estilos/pessoas_executivo_rostos_v1.jpg`. Aguardando escolha do Felipe antes de qualquer outra pessoa.

**Felipe (26/11/2026):** "não gostei de NENHUM deles. o olho tá ruim em todos, tá meio realista mal feito, a roupa não tá legal com detalhes. quero que você mude drasticamente seu approach e gere 3 realmente diferentes [...] o pescoço de todos tá muito ruim, o olho também. quero que você proponha novos estilos. lembre que não é pra ser realista, lembre que teremos criaturas e coisas eerie mais pra frente"
→ v2 (`art/blender/build_pessoas_v2.py`): Sombras (silhueta sem rosto, contorno de luz), Máscaras (boneco de cabeça grande, máscara de porcelana com olhos-buraco, gola alta) e Estatuetas Déco (bronze geométrico, rosto dourado de olhos fechados). Imagens: `estilos/pessoas_executivo_3estilos_v2.jpg`, `estilos/pessoas_executivo_rostos_v2.jpg`.
**Felipe:** "quero ver uma pessoa normal nesses estilos. entenda que eu já gostei muito desses que você me trouxe ESPECIFICAMENTE o da máscara. quero ver como seria a pessoa normal nesse estilo pois são elas que vão estar vindo no começo e sentados na mesa."
→ Direção: estilo Máscara. Normais = máscara com olhos pintados, bochechas e expressão; olhos-buraco ficam para os estranhos.
→ `art/blender/build_mascaras.py`: estilo Máscara com pessoas normais (olhos pintados à mão, sobrancelhas, bochechas, lábios e expressão por personagem). Executivo cansado de pé no balcão; Turista sorridente (coque, vestido, câmera) e Aposentado (grisalho, bigode, óculos, tweed) sentados à mesa. O estranho de olhos-buraco fica ao lado para contraste. Ver `estilos.html?pessoas=normais` e `estilos/mascara_normais_*_v1.jpg`.

**Felipe (26/11/2026), com print do Aposentado de lado:** "legal sim. e outra, a roupa não tá boa, tá descentralizada, a gravata tá ruim. e esse aqui parece que tem uma coisa atrás da cabeça dele, melhore isso. mas sim, eu adorei esse estilo de personagem, só entenda que eles precisam ser diferentes entre si, roupas diferentes e tudo mais, mas tá bem bom esse estilo. qual o próximo passo, e sim faça pequenas melhorias que você acha que ficariam boas"
→ **Estilo Máscara aprovado.** Regra: cada personagem com roupa e silhueta próprias.
→ Correções (`build_mascaras.py` v2): lapelas simétricas; gravata com nó e lâmina em bico, centralizada (torta só no Executivo cansado); normais com cabeça inteira de porcelana sem emenda e sem fitas (cabeça preta + fitas só nos estranhos); rosto pintado em textura 1024 px (fim do serrilhado); cabelo como faixa paramétrica de borda lisa. Imagens: `estilos/mascara_normais_*_v2.jpg`.

**Felipe (26/11/2026):** "ficou bom assim, e quero um personagem que tenha 2 rostos, atrás e na frente, chegando ele parece normal, mas quando ele vira revela a outra cara dele (faça só 1 assim). e sim tá tudo muito bom pode continuar, adorei o estilo, antes de gerar o guarda-roupa e tudo do ato 1, quero que você me relembre os personagens e os estilos deles antes de gerar pra gente aprofundar mais nos estilos deles."
→ Dois rostos: a **Detetive** (cliente 7). De frente desconfiada; na nuca um segundo rosto (olhos pretos, sorriso fino). Sobretudo, chapéu, chanel deixando a nuca livre. No laboratório ela vira de costas a cada 16 s. Imagens: `estilos/mascara_detetive_*_v1.jpg`.
→ Escultura agora respeita frente/costas (antes o relevo do rosto vazava para a nuca); costura da textura do rosto movida para a lateral.
→ Ficha dos 15 no estilo Máscara para aprofundar: [personagens_mascara_v1.md](personagens_mascara_v1.md).

**Felipe (26/11/2026):** "pode gerar TODOS do ato 1 sim"
→ Ato I completo no estilo Máscara (`build_mascaras.py`): Executivo (agora com maleta de couro), Turista, Aposentado (agora com colete e bengala) e a nova **Festeira** (vestido de franjas anos 20, faixa com pena e joia, colar longo de pérolas, luvas pretas longas, piteira com brasa, sombra nos olhos e pinta). Cena: `estilos.html?pessoas=ato1`. Imagens: `estilos/ato1_*_v1.jpg`.

**Felipe (26/11/2026):** "Sim, Ato II"
→ Ato II completo no estilo Máscara: **Cavalheiro** (fraque com abas, colete e gravata-borboleta brancos, cartola, monóculo com corrente, bengala de castão prateado; máscara pálida, simétrica, sem expressão), **Universitário** (suéter de losangos pintado por código, cachecol listrado, boina, livros, sardas, sorriso largo; sentado à mesa), **Detetive** (dois rostos) e **Homem Encharcado** (capa oleada brilhante, chapéu de pescador, botas, gotas, poça; a tinta dos olhos escorre pela máscara molhada). Cena: `estilos.html?pessoas=ato2`. Imagens: `estilos/ato2_*_v1.jpg`.

**Felipe (26/11/2026):** "pode fazer TODOS."
→ Atos III e IV e o pianista no estilo Máscara: **Dama Pálida** (vestido longo marfim com cauda, véu de renda, luvas longas; máscara pálida com rachaduras), **Homem Alongado** (2,3 m, chapéu-coco; máscara pequena demais numa cabeça preta), **Desavisada** (cardigã, blusa, saia plissada, bolsa; normal e alegre), **Cego** (venda com nó, bengala branca de ponta vermelha; máscara sem olhos), **Sem-Rosto** (sobretudo, cachecol até o queixo, fedora; porcelana em branco), **Sorridente** (colete listrado, ligas nas mangas, gravata-borboleta, cartola vermelha, corrente de relógio; sorriso esculpido de orelha a orelha), **Proprietário** (smoking, capa até o chão com forro vinho, anel com rubi; máscara preta, olhos-buraco com brilho fraco) e o **Pianista** (fraque, de costas, no piano). Cenas: `estilos.html?pessoas=ato3` e `ato4`. Imagens: `estilos/ato3_*`, `estilos/ato4_*`, `estilos/pianista_v1.jpg`.

**Felipe (26/11/2026):** "tá ótimo, depois qualquer coisa eu mudo. agora tendo isso quero que você organize TUDO que você fez muito bem organizado os assets e tudo mais e crie um outro agente agora pra cuidar de tudo da mecânica do jogo. fazer o jogo realmente ser jogável e testar as mecânicas atuais. já commite tudo e contextualize esse começo pra ele. faça esse agente sob a sua sessão"
→ Organização: modelos em `public/models/{cenario,props,pessoas,experimentos}`; `art/gerar_modelos.sh` gera tudo no Windows e copia para as pastas; catálogo [ASSETS.md](ASSETS.md); mapa [README.md](README.md); `CLAUDE.md` na raiz com stack, mapa e regras do Felipe para qualquer agente.
→ Nova sessão dedicada à mecânica do jogo (jogabilidade e testes), ligada a esta.

## 26/11/2026 · frente da mecânica (branch `feat/adicionar-mecanicas`)

**Felipe:** "entenda que precisamos ver o que foi recentemente commitado na main, pegue a versao mais recentea da main. e antes de comecar a codificar vamos conversando aqui. primeiro que o nome nao vai ser spirits e spirits. e primiero entenda qrelamnet quais sao as mecanicas exsitentes la."
→ Levantamento: a main recebeu o PR #1 da equipe (gaveta de utensílios com alicate, pinça e faca; copo pego na estante a cada cliente; avisos "Macerado/Mexido/Batido"; pousar objetos livremente), feito no protótipo A-Frame. Ainda não portado para a v2.

**Felipe:** "logico que a nossa versao ne, a mais avancada v2. o nome do jogo quero que voce sugira. algo relacionado a barman, e que HINTE a algo creepie e eerie. mas algo nessa vibe. E sobre a equipe, sim eels sabem"
→ Base do jogo: v2 (R3F). As funções do PR #1 serão refeitas na v2. Nome novo: sugestões em discussão (o nome "Spirits & Spirits" será substituído).

**Felipe:** "vamos de on the house mesmo. e pode comecar"
→ Nome do jogo: **On the House** ("por conta da casa": a Casa é o bar, que cobra no contrato do epílogo). Trocado no título, barra, créditos, placa da cena do jogo, README, CLAUDE.md, visao.md e package.json. Documentos antigos (devlog, ficha v1, moodboard, planta_v1) ficam como estavam (acervo). O laboratório de arte (`estilos.html`, `art/blender/labels.py`) é da frente da arte.
→ Começa o porte das funções do PR #1 da equipe para a v2.

**Felipe:** "so pra entender, voce ta fazendo o jogo no nosso novo estilo e grafico ne? digo isso pois as capturas de tela tao com os antigos"
**Felipe:** "cara, LOGICO que ue quero levar pro jogo novo. o antigo era so pra testar as mecanicas lee tudo. e essa e literalmetne a SUA task. pegar o jogo novo e colocar as mecanicas ja existentes NEEL. e deixar jogave"
→ A sessão da mecânica passa a integrar a arte nova (bar Âmbar Noturno, objetos e clientes Máscara) na cena do jogo, mantendo as mecânicas.

**Felipe (26/11/2026):** "aqui o relatorio de maecanicas que meu amigo preparou" (anexo `Relatorio de mecanicas.docx`)
→ Guardado em [equipe/relatorio_mecanicas_v0.1.0.docx](equipe/relatorio_mecanicas_v0.1.0.docx) (texto em `.txt` ao lado). Descreve o protótipo A-Frame no commit 827d239 e traz 36 fichas de validação humana. Serve de referência das mecânicas a manter na v2.

**Felipe (26/11/2026):** "precisamos fazer o deles, com basen o mesmo estilo." (modelos para coqueteleira, tampa, colher, macerador, potes, cuba, pia, bandeja, gaveta, utensílios, bichos e mão do cliente)
**Felipe:** "sim concordo, precisamos melhorar isso. entenda SUA FUNCCAO vai ser exatamente isso, aproveitar o estilo que ja ta linod e fazer ele ser relamnete jogavel, deixar mais perto as coisas, poder pegar as coisas e tudo mais. entendeu? voce precisa mudar e deixar TUDO jogavel de verdade pesqiuse e estudo boas praticas pra fazer isso. e tenha essa liberdade total pra fazer isso. lemrbadno apenas de mantaer todo estilo feito e crie novos estilos pra coisas assim que precisamso"
→ A sessão da mecânica integra o bar Âmbar Noturno e as pessoas Máscara no jogo, aproxima a estante (garrafas ao alcance em VR), cria por código no Blender os objetos de jogo que faltam no mesmo estilo e faz a passada de jogabilidade (boas práticas de interação em VR).

**Felipe (26/11/2026, vendo a primeira integração):** "ja vou dar um toque, ta MUITO RIUM isso aqui. voce ta reaproveitanod a UI deles. HORRIVEL NAO ERA PRA FAZER ISSO. nos estamos redeesnehadno TUDO de UI do ZERO. faca isso, nao quero repaorveitar nada UI do antigo."
→ A UI inteira (placas no mundo, barra, caderno, diálogos, etiquetas) será redesenhada do zero no estilo Âmbar Noturno; nada da UI do protótipo é reaproveitado.
→ Resultado (mecânica v1): bar Âmbar Noturno como cena do jogo, estante 60 cm mais perto, 26 objetos novos no Blender (`utensilios.glb`), UI nova do zero (comanda de papel, legendas, latão gravado, tela de abertura, caderno de couro), pouso assistido e correções de física. Os 9 pedidos passam pelo desktop (objetos 3D e Caderno) e pelo Quest simulado só com gestos. Relatório: [mecanica_v1.md](mecanica_v1.md); capturas em `estilos/jogo_v1/`.

**Felipe (26/11/2026):** "nao quero que nenhuma branch, nem commite, nem PR NEM NADA, tenha o nome claude. nem como co author nem nada. tudo no meu nome e no conventional commits. feat/redesign e feeat/ adicinoar mecanicas. faca isso e commite e abra o PR"
→ Histórico reescrito sem coautoria nem menções ao assistente, mensagens em conventional commits, autor Felipe. Branches: `feat/redesign` (migração para a v2, laboratório de arte e pessoas Máscara) e `feat/adicionar-mecanicas` (mecânicas no bar novo, UI nova, objetos de jogo), uma sobre a outra.

**Felipe (26/11/2026):** "pode aplicar TUDO isso [otimizações] e cade o piano, parei de ouvir ele. e que oque voce faca muiot bem feito isso do piano mas garantindo que nao fique feio, qual voce acha que tem risco de deixar o jogo pior e feio?"
→ Piano novo no jogo (síntese de cordas, sala, música que piora a cada ato) e murmúrio das mesas. Geometria fixa juntada por material (visual idêntico).

**Felipe (26/11/2026):** "entenda que a ambientalizacao e a atmosfere e o MAIS IMportante pra imersao. e isso vai vir justamente da ilumincao, por isso nao podemos economizar nisso e no audio tambem. sao o mais importante. vemdo o preview vi que ja ta HORRIVEL essa luz branca e a lampada ali. eu quero SIM aquela luz climatica bonita que tava no bar todo"
→ Regra: luz e áudio não entram em economia. Volta a iluminação completa do laboratório (todas as luzes, sombras, vidro âmbar, bloom, vinheta e grão no computador); sai a luz de trabalho branca e as "poças de luz" pintadas.
→ Registro completo em [otimizacao_v1.md](otimizacao_v1.md) (feito, recusado por ficar feio, adiado).

**Felipe (26/11/2026, vendo a captura do VR):** "se essa for a versao vr atual ta MUITO FEIO . melhore e deixe igual o do desktop" / "to dizendo da LUZ, ela e o segredo de parecer bom. uma ilumincao boa, deixe mais imersivo e melhor"
→ VR com a mesma atmosfera do computador: todas as luzes e sombras, halos e névoa âmbar nas luzes, cone de luz sob as luminárias, cúpula sem estourar em branco; mãos de porcelana. Capturas em `estilos/otimizacao_v1/`.

**Felipe (26/11/2026, comparando VR e computador):** "ta meio ruim isso do contorno escuro em volta da luz embaixo ali. alem disso NAO ta legal isso de vermos a lampada dentro. veja como esta a iluminacao no compuador e diexe exatamente igual no VR, mas otimizando mais. e se nao der pra otimizar TUDO BEM. eu qeur oque a iluminacao esteja boa igual. essa ambientalizacao e necessario. [...] como estava 100vezes mais bonito no PC. e literalmente outro jogo. quero que voce volte e va deixando uigual no PC"
→ Removidos os halos/névoa/cones falsos; pós-processamento próprio no VR com a mesma receita do computador (bloom, vinheta, grão, ACES), olho por olho. Capturas `estilos/otimizacao_v1/vr_luz_v3.png` e `jogo_bartender_v2.png`.

**Felipe (26/11/2026, com capturas):** "aqui um bug que eu percebi olha os personagems [...] antes de carregar tudo, voce mostra uma versao antiga nessa tela. EU NAO QUERO ISSO. carregue de verdade e so mostre a tela quando tudo relamente carregar [...] olhe a comparacao do PC e do VR O do PC ta infinitamnete mais bonito. sem esses pixelados exagerados e com um ponto preto muito melhor [...] EU QUERO que fique igual no PC esta muito lindo"
→ Cliente de blocos removido (aparecia junto do Máscara). O bar só aparece com todos os modelos carregados (botão "Preparando o bar…"). VR: grão aplicado no espaço de exibição (pretos voltam a ser pretos), vinheta certa em mono e estéreo, simulador na resolução real da tela, Quest em 1,25x da resolução recomendada, sem foveação e com sombras de 1024 px. Captura: `estilos/otimizacao_v1/vr_luz_v4.png`.
