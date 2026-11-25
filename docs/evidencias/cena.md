# Testes técnicos da estação 3D

**Data:** 24/11/2026. **Ambiente:** macOS, Node.js 24.13.0, A-Frame 1.8.0 e Google Chrome 158.0.8127.38 headless com WebGL via SwiftShader. As entradas de mouse e teclado vieram do Playwright. Nenhuma sessão física do Quest 3 foi executada.

| Execução | Objetivo e procedimento | Resultado observado | Correção, evidência e reteste |
|---|---|---|---|
| C01 | Carregar a cena e inspecionar as placas em perspectiva | **Falha.** A geometria apareceu, mas as placas ficaram brancas. O carregamento assíncrono substituía o material que havia recebido o texto. | A textura local é reaplicada depois da inicialização do material. [Captura da falha](capturas/falha-placas.png). Reteste C04. |
| C02 | Projetar os centros de rum, cola, limão, gelo, copo e bandeja na tela e tentar servir o Executivo pelo mouse | **Falha.** Rum e cola entraram no copo. O centro do limão ficou fora da vista inicial de 1440 × 900. O robô clicou fora da cena e a sequência interrompeu-se com coordenada de clique inválida. | A orientação inicial de desktop passou a mirar 12° abaixo do horizonte. O teste passou a verificar se o ponto está visível antes de clicar. Retestes C03 e C04. |
| C03 | Verificar os materiais das placas, clicar nas quatro porções e entregar o Cuba Libre | **Parcial.** As 19 placas receberam texto e a Turista chegou. Na inspeção da captura, o copo havia desaparecido da bancada após a entrega. | A posição de retorno de cada utensílio passou a vir das coordenadas declaradas no cenário. Antes, alguns objetos eram registrados enquanto o A-Frame ainda inicializava suas posições. Reteste C04. |
| C04 | Iniciar pelo menu, testar as 19 texturas de texto, servir três pedidos por clique nos objetos, macerar, tampar, agitar com E, abrir, transferir e entregar | **Passou.** O segundo atendimento reutilizou o copo. A agitação e a transferência permitiram chegar ao fim da amostra. A captura foi inspecionada e mostra os letreiros, rótulos dos sólidos e copo na bancada. | [Ensaio integrado](../../scripts/browser-check.js) e [captura do segundo atendimento](capturas/reteste-cena.png). A execução não usa o painel de preparo assistido. |
| C05 | Exercitar funções de limiar com séries de tempo e deslocamento conhecidas | **Passou.** Cinco testes passaram nas duas execuções. Cobrem garrafa em pé/distante, permanência, uma dose por inclinação, rearme, intervalo longo, transporte sem agitação e agitação alternada em três eixos. | [Testes dos gestos](../../tests/interactions.test.js). Na revisão, a perda da inclinação antes da dose passou a zerar a permanência. Estes dados sintéticos medem regras numéricas. |
| C06 | Revisar a exibição da última ação enquanto um objeto é manipulado | A leitura anterior guardava uma referência ao mesmo estado mutável. Uma mensagem de objeto em mãos podia encobrir a confirmação da ação. | A estação guarda o texto anterior e limpa o aviso físico ao despachar o comando. A captura C04 mostra a aprovação na placa. Confirmar legibilidade e duração percebida em VR durante a validação humana. |

## Reprodução

Com as dependências instaladas, execute na raiz do projeto:

```sh
node --test tests/interactions.test.js
npm run test:browser
```

O ensaio C04 foi executado originalmente com `node tests/scene-browser.mjs http://127.0.0.1:8080` e servidor local ativo. O fluxo pelos objetos 3D foi consolidado no teste de navegador acima, que inicia seu próprio servidor. `CHROME_BIN` aceita o caminho do Chrome ou Chromium. Para guardar novas capturas do ensaio integrado, defina `BAR_EVIDENCE_DIR` com um novo diretório. Preserve os registros anteriores.

## Validação física pendente

Medir alcance, conforto, legibilidade binocular, entrada e saída de WebXR, ambas as mãos e desempenho em hardware. Conferir o intervalo e a força necessários para agitar e se o despejo físico adiciona uma única unidade por inclinação. O limiar da boca da garrafa é uma esfera de 13,5 cm ao redor da abertura do recipiente, com permanência de 430 ms. A sensibilidade pode ser ajustada depois dos testes humanos. Executar também as tentativas de alcançar ingredientes e limpar a estação com uma mão, sentado e em pé.

## Eventos ambientais · 24/11/2026

- C07. Sete testes de temporização e movimento passaram. A barata volta após escapar, o rastro permanece após a passagem da lesma e a aranha fica disponível ao completar a descida. Os testes usam tempo de jogo simulado.
- C08. O primeiro ensaio integrado no Chrome concluiu nove entregas e capturou os três eventos na cena 3D. O Caderno permitiu repetir a coleta depois de devolver o ingrediente e depois de lavar o recipiente.
- C09. No ensaio sem capturas de tela, o descarte e a nova captura da barata passaram. A sonda de mouse tentou recolher a aranha enquanto ela ainda descia e não encontrou a amostra no pratinho. O roteiro passou a esperar a altura de captura e conferir a confirmação de coleta antes de procurar a amostra.
- C10. Duas tentativas com espera assíncrona dentro da sonda ainda emitiram o clique antes de estabilizar a aranha. Em uma delas já se usava a posição revista e uma etiqueta de captura. A instrumentação do ponteiro confirmou que o raio atingia o espaço vazio. O ensaio agora lê a altura final uma vez e consulta a posição real a cada quadro com uma condição síncrona. Na repetição instrumentada, os nove clientes foram servidos pela cena; o clique na aranha registrou a coleta e a entrega do Martini foi aprovada.
