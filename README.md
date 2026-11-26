# On the House

Um jogo de bartender em primeira pessoa. O turno começa com clientes comuns, um manual de receitas e um posto fixo atrás do balcão. O protótipo percorre nove atendimentos e introduz a primeira estranheza do turno. A primeira entrega acadêmica e seus resultados estão preservados em [Entrega 01](docs/entrega-01.md).

## Abrir no desktop

A v2 roda em **React Three Fiber (Three.js) + WebXR + Rapier**, com Vite e TypeScript. Com Node.js 22 ou superior:

```sh
npm install
npm run dev
```

Abra o endereço que o Vite mostrar (normalmente `http://localhost:5173`) e clique em um ingrediente para iniciar o turno com ele na mão. Você também pode usar **Iniciar turno** na barra superior ou a placa **Iniciar** da estação. Use **Caderno** para os controles assistidos. `npm run build` gera o site estático em `dist/`, que pode ser servido por qualquer hospedagem HTTPS.

**Arte final (laboratório):** `http://localhost:5173/estilos.html` mostra o bar no estilo Âmbar Noturno; `?pessoas=ato1` (até `ato4`) mostra os clientes no estilo Máscara. Tudo é gerado por código no Blender (`art/`); catálogo em [docs/v2/ASSETS.md](docs/v2/ASSETS.md) e mapa da documentação em [docs/v2/README.md](docs/v2/README.md).

O protótipo original em A-Frame está preservado em [legacy/aframe](legacy/aframe/README.md) e abre com `npm run start:legacy`.

## Jogar

| Atendimento | Preparo |
|---|---|
| Executivo · Cuba Libre | Monte rum, cola, limão e gelo no copo Highball. |
| Turista · Caipirinha | No Rocks, macere limão e açúcar. Complete com cachaça e gelo. |
| Aposentado · Whiskey Sour | Ponha whisky, suco de limão, xarope de açúcar e gelo na coqueteleira. Feche, agite, abra e transfira ao Coupe vazio. |
| Festeira · Margarita | Agite tequila, licor de laranja, suco de limão e gelo na coqueteleira fechada. Abra e transfira ao Coupe. |
| Cavalheiro · Negroni com barata | No Rocks, junte gin, Campari, vermute tinto, gelo e uma barata coletada na face interna do balcão. Mexa com a colher. |
| Universitário · Mojito | Macere limão e açúcar no Highball. Acrescente rum, hortelã, água com gás e gelo. |
| Detetive · Dry Martini | Junte gin, vermute seco e gelo no Coupe e mexa com a colher. |
| Homem Encharcado · Moscow Mule com gosma | Monte vodka, ginger beer, suco de limão, gelo e a gosma deixada pela lesma na caneca. |
| Homem Alongado · Martini com aranha | Junte gin, vermute seco, gelo e a aranha no Coupe. Mexa com a colher e sirva. |

Se você servir um drink errado, o cliente reclama e devolve o copo com o preparo intacto. A lista do copo devolvido fica oculta. Lavar o copo na pia volta a permitir a consulta dos ingredientes do próximo preparo. Use uma unidade por ingrediente. Os ingredientes comuns ficam disponíveis na estação desde o início. Os animais habitam o bar desde a abertura. Quando o cliente pede um deles, a interação também permite separar uma porção para o drink. Para receitas mexidas, use a colher no copo **depois de adicionar o último ingrediente**. A pia permite refazer um preparo e coletar outra porção especial após descartar a anterior.

**Comanda** mostra o pedido, o conteúdo dos recipientes e a técnica. O livro no suporte à direita permite consultar as nove receitas-base desde a abertura. No livro e no Manual, cada página ensina o preparo convencional. Os acréscimos exóticos vêm do pedido do cliente. Clique na página direita para avançar ou na esquerda para voltar. Em VR, aponte e use o gatilho. No desktop, a aba **Manual** oferece a mesma consulta. Para escolher o recipiente vazio, selecione um dos modelos no suporte à esquerda.

O atendimento aprovado avança o relógio. A sequência segue os pedidos 1 a 8 do devlog e passa diretamente ao 10, do Homem Alongado. O nono atendimento jogável encerra este recorte e libera o reinício. O pedido 9 do roteiro completo, da Dama Pálida, depende da mecânica corporal prevista para outra etapa.

**Coletar no cenário.** A barata anda na face interna do balcão e a aranha desce por um fio sobre o posto do bartender. A lesma percorre o chão sob a estante de bebidas, atrás do bartender. Pegue o animal diretamente com a mão e solte-o no recipiente. A barata e a aranha reaparecem após alguns segundos. Na lesma, você recolhe a gosma enquanto ela segue andando e formando um novo rastro. Quando a fonte está disponível, cerca de 12 segundos sem interação revelam uma pista adicional. Soltar uma porção fora do recipiente ou lavar o copo que a contém permite uma nova coleta. Em VR, mexa a colher em círculos dentro do copo.

**Desktop em 3D.** Arraste na cena para olhar. Clique em um objeto para pegá-lo. Na estante atrás de você, pegue uma garrafa, vire para o balcão e clique no copo ou na coqueteleira para servir uma dose. Volte à estante e clique na base identificada para guardar a garrafa. A pia e a cuba de gelo ficam à esquerda. Clique na cuba ou nos potes de limão e hortelã para retirar uma porção. Para o açúcar, pegue a colher, clique no pote e depois no recipiente. A tecla **E** executa a ação contextual. Com um item em mãos, **Q** o arremessa na direção da câmera. Para lavar, leve o copo ou a coqueteleira até a pia. Para servir, clique no copo pronto e depois no cliente ou na mão que ele estende. A bandeja também aceita a entrega. Para agitar pelo teclado, pegue a coqueteleira fechada, mire em uma área vazia e pressione **E**. Um clique em área vazia devolve o utensílio à origem.

**Preparo assistido.** A página **Bancada** permite escolher o recipiente, adicionar uma unidade, lavar, trocar o copo vazio e usar macerador, colher e coqueteleira pelos botões. Para os eventos, escolha **Coletar**, selecione o recipiente e use **Adicionar ao recipiente**. **Devolver ao ambiente** permite soltar a porção antes de depositá-la. Entregue em **Comanda**. A simulação usa as mesmas regras dos objetos na cena. É possível testar o fluxo com mouse e teclado sem executar os gestos físicos.

**Meta Quest 3.** Cada mão pode segurar um objeto pelo grip. Por exemplo, segure o copo com a esquerda e incline uma garrafa com a direita, ou inverta as mãos. Com o rastreamento de mãos ativo, faça uma pinça sobre o objeto para pegá-lo e outra sobre o alvo para usá-lo. Solte o grip com a mão parada para deixar o objeto cair, ou durante um movimento para arremessá-lo. A velocidade e o giro da mão passam ao objeto, que pode quicar, tombar e ser pego onde parar. Para depositar um sólido, solte-o junto ao recipiente. Mergulhe a colher no açúcar e leve a colherada para dentro do copo ou da coqueteleira aberta. Para mexer, dê uma volta com a colher dentro do copo. Para macerar, levante o macerador e bata duas vezes no limão com açúcar. Incline a garrafa e aproxime sua boca do copo ou da coqueteleira até registrar uma dose. Retorne à vertical para rearmar. Para despejar a mistura, abra a coqueteleira e incline sua boca sobre o copo vazio até o conteúdo passar para ele. Pegue a tampa ao lado da coqueteleira e solte-a sobre a boca para fechar. Pegue-a de novo para abrir. Agite com movimentos curtos ou use o gatilho com a coqueteleira fechada apontada para uma área vazia. Para servir diretamente, segure o copo pelo grip, aproxime-o da mão estendida do cliente e solte o grip. Para lavar, solte o recipiente na pia. O raio auxilia a seleção à distância.

**Postura e pausa.** O jogador permanece atrás do balcão, sem controles de deslocamento. A placa **Altura** reposiciona a bancada em relação à cabeça. Use-a sentado ou em pé. Há placas para iniciar, pausar, retomar e reiniciar após o fim. No desktop, a barra superior contém controles e som. As instruções e respostas de preparo também são visuais. Recarregar a página inicia uma sessão nova.

## Acesso HTTPS no Meta Quest 3

O Quest precisa de um endereço HTTPS. Três caminhos:

1. **Vite na rede local (mais rápido para desenvolver).** Computador e headset na mesma rede:

   ```sh
   npm run dev:quest
   ```

   O Vite mostra um endereço `https://<ip-do-computador>:5173`. Abra no Meta Quest Browser e aceite o aviso do certificado de desenvolvimento.
2. **Hospedagem com HTTPS confiável.** Rode `npm run build` e publique a pasta `dist/`.
3. **Caddy 2 na rede local**, servindo `dist/` com a autoridade local do Caddy:

   ```sh
   npm run build
   BAR_HOST=192.168.1.42 caddy run --config Caddyfile
   ```

   Troque o IP pelo endereço LAN do computador (`ipconfig getifaddr en0` no macOS). Para o headset confiar, instale a raiz pública do Caddy (`pki/authorities/local/root.crt` dentro de `caddy environ` → `caddy.AppDataDir`). [HTTPS local no Caddy](https://caddyserver.com/docs/automatic-https#local-https)

No headset escolha **Entrar em VR**, use a placa **Iniciar** se o turno ainda estiver no menu e ajuste **Altura**. Mãos, tracking, alcance, conforto, FPS e retorno da sessão só podem ser verificados no aparelho físico.

**Sem headset:** abra `http://localhost:5173/?xr-emulate` para simular um Meta Quest 3 no navegador (Chrome) e entrar em VR com controles virtuais.

## Testes técnicos

Com Node.js 22+ e o Chrome ou Chromium instalado:

```sh
npm test               # regras do jogo e gestos (Node)
npm run typecheck      # TypeScript
npm run test:browser   # joga os 9 pedidos no Chrome (pedido 1 pelos objetos 3D, demais pelo Caderno) + arremesso + reinício
npm run test:xr        # entra em VR com um Quest 3 simulado e usa os controles para pegar, soltar e despejar
```

Os ensaios sobem um Vite temporário. Em outras instalações, aponte `CHROME_BIN` para o executável. `BAR_TEST_URL` testa um servidor já iniciado e `BAR_EVIDENCE_DIR` grava capturas da rodada.

## Validação humana e material da entrega

1. Abra o [plano de testes](docs/plano-de-testes.md) e execute **D-01 a D-10** no desktop.
2. No Meta Quest 3 físico, execute **Q-01 a Q-08** pelo endereço HTTPS. Anote mão, postura, modo de interação, dispositivo e dificuldades.
3. Registre **cada tentativa** na [ficha de resultados humanos](docs/resultados-humanos.md), inclusive falhas e interrupções. Vincule cada reteste à ocorrência original.

| Documento | Conteúdo |
|---|---|
| [Ficha do projeto](docs/ficha-do-projeto.md) | História, público, objetivos, tecnologias, escopo e situação da equipe |
| [Moodboard visual](docs/moodboard/index.html) | Prancha HTML offline com obras reais, créditos, estudos de luz por ato e referências de jogo e cinema. Abra o arquivo local no navegador. |
| [Planejamento e decisões](docs/planejamento.md) | Requisitos vigentes, dependências, decisões, dívidas e backlog provisório |
| [Resultados técnicos](docs/resultados-tecnicos.md) | Execuções, falhas, correções, retestes e evidências |
| [Relatório da primeira entrega](docs/entrega-01.md) | Revisão dos critérios da semana, arquivos e pendências |
| [Devlog de referência](DEVLOG_SPIRITS_AND_SPIRITS_CODEX.md) | Especificação da versão completa e ordem dos 15 clientes |

## Estrutura e tecnologia

```text
index.html                         Página (barra, caderno, diálogos)
src/
  main.ts                          Integração da interface HTML com o jogo
  app/App.tsx                      Canvas React Three Fiber + sessão WebXR (@react-three/xr)
  domain/                          Regras: clientes, ingredientes, receitas, sessão (sem mudanças da v1)
  interaction/                     Gestos (despejar, agitar, mexer, macerar), controles e física Rapier
  scene/                           Bar em primitivas (greybox), placas, eventos ambientais
  dev/xr-emulate.ts                Simulador de Quest 3 para desenvolvimento
  lab/                             Laboratório da arte final (estilos.html): bar, assets, pessoas
art/blender/                       Scripts Blender que geram todos os modelos (sem assets externos)
art/gerar_modelos.sh               Gera no Windows e copia para public/models/
public/models/                     cenario/, props/, pessoas/ (estilo Máscara), experimentos/
scripts/                           Ensaios de navegador e de VR simulada
tests/                             Testes unitários em Node.js
legacy/aframe/                     Protótipo original em A-Frame (preservado)
docs/                              Planejamento, registros, moodboard e docs/v2 (redesign)
```

Stack: Vite, TypeScript, React 19, React Three Fiber, @react-three/xr, Three.js, Rapier (física de arremesso) e Web Audio. As decisões da v2 estão em [docs/v2/visao.md](docs/v2/visao.md).

## Estado atual

Há nove dos quinze clientes previstos. Os seis pedidos restantes são os de números 9 e 11–15 do devlog. Ingredientes corporais fictícios, efeitos sensoriais cumulativos, ambientação completa dos quatro atos, contrato e cutscene permanecem no backlog. A cena ainda é o greybox de primitivas do protótipo, à espera do redesign visual. A estação usa doses lógicas e encaixes de preparo. Os objetos arremessados usam corpos rígidos do Rapier (as patas articuladas dos insetos do protótipo A-Frame ainda não foram portadas). O progresso fica na memória da página. A duração da versão final, o desempenho físico no Quest 3 e a ergonomia seguem sem medição. Nomes e responsabilidades dos integrantes aguardam definição da equipe.
