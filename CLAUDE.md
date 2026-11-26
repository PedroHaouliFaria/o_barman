# Spirits & Spirits · instruções para agentes

Jogo VR de bartender com terror psicológico estilizado, para a turma de Experiências Imersivas. Dono: Felipe. Fale em **português**.

## Stack e comandos

Vite + TypeScript + React 19 + React Three Fiber + @react-three/xr (WebXR, Meta Quest 3) + Rapier (física) + Three.js. Node 22+.

```sh
npm install
npm run dev            # jogo em http://localhost:5173 ; laboratório de arte em /estilos.html
npm run dev:quest      # HTTPS na rede local para abrir no Quest
npm test               # regras do jogo e gestos (node --test)
npm run typecheck
npm run test:browser   # joga os 9 pedidos no Chrome (Playwright)
npm run test:xr        # Quest 3 simulado: pegar, soltar, despejar
npm run build
```

`?xr-emulate` na URL do jogo simula um Quest 3 no navegador.

## Mapa

- `src/domain/` regras (pedidos, receitas, preparo, sessão). JS puro, testado em `tests/`.
- `src/interaction/` gestos (`motion.js`), controles desktop/VR (`controls.ts`), física de arremesso (`throw-physics.ts`), trajetos dos eventos.
- `src/scene/` cena do **jogo** (greybox de blocos, porta 1:1 do protótipo A-Frame).
- `src/main.ts` + `index.html` interface HTML (barra, caderno, diálogos).
- `src/lab/` + `estilos.html` laboratório da **arte final** (bar Âmbar Noturno + pessoas Máscara).
- `public/models/` modelos gerados (ver `docs/v2/ASSETS.md`). `art/blender/` scripts que geram tudo.
- `legacy/aframe/` protótipo original (não editar; só referência).
- `docs/v2/README.md` mapa de toda a documentação da v2.

## Regras do Felipe (não quebrar)

1. **O jogador fica parado atrás do balcão o jogo inteiro.** Sem locomoção. Pode virar a cabeça.
2. **Estilo visual: Âmbar Noturno** do começo ao fim; pessoas no **estilo Máscara** (aprovado).
3. **Assets só por código no Blender** (`art/blender/`), nada baixado.
4. **Nada de z-fighting**: nenhuma superfície coplanar; objetos pousados ficam 2 mm acima; vidro só de um lado.
5. **Acervo total, nunca perder nada**: versão nova = arquivo novo (`_v2`…); nada se apaga; cada pedido do Felipe vai para `docs/v2/HISTORICO.md` com as palavras dele e a data; tudo vira commit.
6. Trabalho pesado (Blender, render, vídeo, GPU) roda no Windows `ssh simaonote` (ver `art/README.md`).
7. Mostrar ao Felipe antes de mudar algo sensível (pessoas, estilo). Ele aprova por imagem.
