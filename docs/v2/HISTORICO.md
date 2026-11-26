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
