# SPIRITS & SPIRITS — Devlog e especificação de implementação

**Versão:** 1.0 | **Status:** pré-produção | **Prazo:** 5 semanas | **Título provisório:** Spirits & Spirits

> Quanto melhor você desempenha seu trabalho, menos humano você se torna.

> **Nota de 26/11/2026 (v2):** este arquivo é a cópia original do devlog v1.0, preservada sem mudanças de conteúdo (apenas o texto foi recuperado de um problema de codificação). A stack descrita nas seções 2 e 10 (A-Frame) foi substituída na v2 por React Three Fiber + WebXR; ver `docs/v2/visao.md`. Decisões novas vão para `docs/v2/`, não para este arquivo.

## 1. Instruções para o Codex

Este documento é a especificação de referência do projeto. Leia integralmente antes de implementar. Inspecione o repositório existente e preserve funcionalidades compatíveis. Se estiver vazio, inicialize a estrutura sugerida abaixo. Implemente incrementalmente, priorizando um fluxo jogável completo antes do polimento. Não invente novas exigências narrativas nem altere a ordem dos clientes sem registrar a decisão. Use placeholders funcionais para assets ausentes, documentando origem, licença e substituição. Execute os testes disponíveis a cada etapa; não declare testes em headset realizados sem evidência. Mantenha README com instalação, execução, controles, limitações e checklist. Não dependa de serviços pagos ou back-end para o MVP.

## 2. Ficha do jogo

| Campo | Definição |
|---|---|
| Gênero | Simulação de bartender, terror psicológico e corporal estilizado |
| Plataforma | Meta Quest 3 via WebXR; modo desktop para desenvolvimento |
| Perspectiva | Primeira pessoa, jogador fixo atrás do balcão |
| Público | Jovens adultos e adultos interessados em experiências VR de terror |
| Sessão | Single-player, linear, aproximadamente 20–30 minutos (meta a validar) |
| Conteúdo | 15 clientes, 4 atos, 1 epílogo e 1 cutscene final |
| Estética | Low-poly estilizado, atmosfera retrô de terror |
| Tecnologias | HTML, CSS, JavaScript, A-Frame, WebXR, Web Audio API |

## 3. História e direção narrativa

O protagonista assume um turno noturno em um bar aparentemente comum. A remuneração é atraente; o estabelecimento espera que todos os clientes sejam atendidos. Um manual de receitas e instruções de trabalho orienta o jogador. No início, clientes humanos pedem drinks convencionais. O primeiro pedido absurdo parece apenas excentricidade. Depois de alguns atendimentos normais, os pedidos voltam a ficar estranhos e passam a exigir ingredientes provenientes do ambiente e do corpo virtual do protagonista.

As consequências sensoriais persistem, mesmo quando um cliente comum retorna. O bar se deteriora gradualmente: iluminação, música, relógio e comportamento dos clientes deixam de ser naturais. O último cliente é o Proprietário. Após servi-lo, o estabelecimento fecha e apresenta um contrato de encerramento. O jogador assina com sangue fictício; o contrato pega fogo e desaparece. O protagonista morre. Uma cutscene separada encerra o jogo. A origem do bar não é explicada completamente.

**Regras de direção:** começar genuinamente normal; evitar revelar terror na interface inicial; priorizar contraste e estranheza em vez de jumpscares; não usar memória, sombra ou sanidade como ingredientes; não incluir o coração como pedido final; manter o jogador fixo durante todo o gameplay.

## 4. Progressão e curva de estranheza

Horários fictícios, avançados por atendimento concluído, não por tempo real. Escala 0–10 indicativa de tensão narrativa, não uma variável obrigatória de pontuação. A tensão do pedido oscila; a deterioração ambiental e corporal é cumulativa.

| Ato | Clientes | Horário sugerido | Direção |
|---|---|---|---|
| I — Normalidade | 1–4 | 22h–23h | Tutorial integrado, ambiente acolhedor |
| II — Primeira anomalia | 5–8 | 23h–00h | Primeiro pico, dois pedidos normais, novo pico |
| III — Algo está errado | 9–12 | 00h–01h | Sacrifícios fictícios, pausa normal sem recuperação ambiental |
| IV — Degradação | 13–15 | 01h–02h | Escalada contínua, entidades sobrenaturais |
| Epílogo | — | 02h | Contrato, morte e cutscene |

Curva por atendimento: 0, 0, 0, 0, 2, 0, 0, 3, 5, 5, 3, 7, 8, 9, 9.5; epílogo 10. São sete pedidos normais, três ambientais e cinco corporais. O cliente 11 pede uma bebida normal, mas a tensão do ambiente permanece elevada.

## 5. Cardápio, clientes e interações

Receitas simplificadas para o jogo, não padrões profissionais. Uma unidade virtual por ingrediente listado; gelo de resfriamento é contabilizado na preparação, sem exigir simulação física. A ordem abaixo é a sequência oficial do MVP. Os nomes de personagens são arquétipos, não nomes próprios obrigatórios.

| Nº | Personagem | Pedido | Ingredientes | Técnica | Evento especial |
|---:|---|---|---|---|---|
| 1 | Executivo | Cuba Libre | Rum, cola, limão, gelo | Montar | Tutorial de despejo |
| 2 | Turista | Caipirinha | Cachaça, limão, açúcar, gelo | Macerar e montar | Tutorial de sólidos |
| 3 | Aposentado | Whiskey Sour | Whisky, suco de limão, xarope de açúcar, gelo | Agitar | Tutorial de coqueteleira |
| 4 | Festeira | Margarita | Tequila, licor de laranja, suco de limão, gelo | Agitar | Reforço do tutorial |
| 5 | Cavalheiro | Negroni com barata | Gin, Campari, vermute tinto, gelo, barata | Mexer | Barata na parede lateral |
| 6 | Universitário | Mojito | Rum, hortelã, limão, açúcar, água com gás, gelo | Macerar e montar | Retorno à normalidade |
| 7 | Detetive | Dry Martini | Gin, vermute seco, gelo | Mexer | Diálogo sugestivo |
| 8 | Homem Encharcado | Moscow Mule com gosma | Vodka, ginger beer, suco de limão, gelo, gosma de lesma | Montar | Lesma no balcão |
| 9 | Dama Pálida | Bloody Mary com sangue | Vodka, suco de tomate, suco de limão, gelo, sangue fictício | Montar | Primeiro efeito corporal |
| 10 | Homem Alongado | Martini com aranha | Gin, vermute seco, gelo, aranha | Mexer | Aranha desce do teto |
| 11 | Desavisada | Gin-tônica | Gin, água tônica, limão, gelo | Montar | Pedido normal em ambiente perturbado |
| 12 | Cego | Dry Martini com olho | Gin, vermute seco, gelo, olho fictício | Mexer | Obstrução visual parcial |
| 13 | Sem-Rosto | Old Fashioned com orelha | Whisky, açúcar, Angostura, gelo, orelha fictícia | Mexer | Atenuação de áudio lateral |
| 14 | Sorridente | Daiquiri com dentes | Rum, suco de limão, xarope de açúcar, gelo, dentes fictícios | Agitar | Vocalizações alteradas |
| 15 | Proprietário | Black Russian com dedo | Vodka, licor de café, gelo, dedo fictício | Montar | Alteração visual da mão virtual |

### 5.1 Personagens e falas de pedido

| Personagem | Aparência e comportamento | Fala inicial |
|---|---|---|
| Executivo | 45 anos, camisa social, gravata frouxa, cansado | Que dia desgraçado... Me vê um Cuba Libre, por favor. |
| Turista | Jovem, casual, simpática | Me disseram que aqui fazem uma ótima caipirinha! |
| Aposentado | Grisalho, educado, casaco clássico | Um Whiskey Sour, meu jovem. Sem pressa. |
| Festeira | Roupa elegante, animada | Uma Margarita! A noite está só começando. |
| Cavalheiro | Traje formal, expressão impassível | Um Negroni, por gentileza. Com uma barata. Aquela na parede servirá perfeitamente. |
| Universitário | Moletom, descontraído | E aí, chefe! Consegue fazer um Mojito? |
| Detetive | Sobretudo, observadora | Um Dry Martini. Você começou a trabalhar aqui recentemente? |
| Homem Encharcado | Capa de chuva, roupas úmidas | Um Moscow Mule. Com aquela gosma... Não seja econômico. |
| Dama Pálida | Elegante, imóvel, pele muito pálida | Um Bloody Mary. Mas gostaria que o sangue fosse seu. |
| Homem Alongado | Alto, braços desproporcionais | Um Martini. Há algo no teto que gostaria que acrescentasse. |
| Desavisada | Mulher comum, tranquila, ignora o cenário | Nossa, que lugar agradável! Uma Gin-tônica, por favor. |
| Cego | Venda, acompanha movimentos sem enxergar | Você enxerga coisas demais neste lugar. Um Dry Martini. Com um de seus olhos. |
| Sem-Rosto | Humanoide sem feições, voz inquietante | Há muito barulho aqui. Um Old Fashioned. Com uma de suas orelhas. |
| Sorridente | Sorriso exagerado, risadas involuntárias | Que belo sorriso você tem. Gostaria de levar uma lembrança. Um Daiquiri, por favor. |
| Proprietário | Traje preto, rosto encoberto, voz autoritária | Você tem sido um excelente funcionário. Prepare-me um Black Russian com um de seus dedos. Depois disso, encerraremos seu expediente. |

Falas adicionais: chegada, pedido, reação a erro, aprovação e saída. Usar legendas para todas as informações essenciais. Áudio gravado é opcional no MVP. Reutilizar até seis modelos-base com variantes de roupa, materiais, acessórios e proporções. Um cliente ativo por vez; entrada/saída por animação simples ou transição de visibilidade.

## 6. Mecânicas de gameplay

### 6.1 Loop principal

Chegada → diálogo e pedido → consulta ao manual → coleta dos ingredientes → preparação → entrega na área do cliente → validação → reação → saída → próximo atendimento. O relógio e o ambiente avançam apenas após aprovação. Não existe cronômetro punitivo no MVP.

### 6.2 Controles e estação fixa

- Head tracking e controladores VR de seis graus de liberdade; sem joystick de locomoção, teleporte ou rotação artificial obrigatória.
- Grip para agarrar/soltar, trigger para ações contextuais quando necessário. Feedback visual de alvo alcançável e feedback háptico opcional.
- Desktop: mouse para olhar e selecionar; clique para pegar/soltar, interação contextual por tecla E; interface de teste equivalente para despejar, misturar e entregar. Sem WASD de locomoção.
- Objetos retornam ao ponto de origem se caírem fora do alcance. Não exigir que o jogador caminhe fisicamente, alcance muito alto ou se abaixe excessivamente; oferecer recalibração e modo sentado.

### 6.3 Preparação

Garrafas: detectar inclinação e proximidade da boca do recipiente; adicionar uma unidade após limiar de tempo, com bloqueio contra duplicação contínua. Mostrar fluxo visual simples e som. Sólidos: agarrar e soltar sobre recipiente válido; snap ou colisão simplificada. Macerador: interação contextual ou movimentos repetidos leves. Coqueteleira: inserir ingredientes, fechar, agitar por limiar de movimento/tempo e transferir conteúdo ao copo. Colher: detectar movimento de mistura ou ação contextual. Gelo de resfriamento permanece no registro lógico. Não implementar fluido real, quebra física complexa ou dosagem em mililitros no MVP.

Validação: comparar multiconjunto de ingredientes com receita ativa e verificar técnica exigida e recipiente final. Ingrediente extra, ausente ou técnica incompleta resulta em feedback e tentativa novamente; pia limpa copos/coqueteleira sem perder progresso narrativo. Ingredientes especiais devem poder reaparecer se descartados acidentalmente; efeitos corporais não são aplicados novamente. Manual de receitas acessível o tempo todo, com receitas desbloqueadas conforme o atendimento.

### 6.4 Eventos ambientais

- Barata: spawn em parede lateral dentro do alcance; animação em percurso curto; captura virtual. Se escapar, reaparece após intervalo curto.
- Lesma: atravessa uma área do balcão, deixa uma gosma coletável; coleta sem necessidade de acompanhar movimento rápido.
- Aranha: desce em teia até uma altura confortável; pode ser capturada quando chega à área de interação.

Cada evento ocorre somente durante o pedido relevante. Sinais sonoros e visuais orientam o olhar; dica adicional surge após inatividade. Não deixar o jogador preso por evento perdido.

### 6.5 Ingredientes corporais e deterioração

Representar os sacrifícios com interações sobrenaturais abstratas no avatar: um ponto de interação ou selo luminoso libera um ingrediente virtual após confirmação; usar corte de cena breve, som estilizado e modelo fictício, sem simular procedimentos reais de ferimento. Não exigir contato com o corpo físico ou gestos agressivos. Cada efeito é ativado uma única vez no desbloqueio do ingrediente, persiste até o final e não impede completar as receitas.

| Ingrediente | Efeito persistente | Implementação MVP |
|---|---|---|
| Sangue | Batimento cardíaco e vinheta discreta | Overlay de baixa intensidade e loop de áudio |
| Olho | Obstrução lateral parcial da visão | Máscara em ambos os olhos do headset, sem apagar um display inteiro |
| Orelha | Áudio lateral atenuado | Roteamento estéreo Web Audio; manter informação essencial por legenda |
| Dentes | Respiração e vocalizações alteradas | Troca de clips ou filtro de áudio |
| Dedo | Mão virtual alterada | Variante de mesh; preservar capacidade de agarrar e soltar |

Modo de conforto: reduzir ou desativar máscaras, distorções e filtros sem alterar história ou progresso. Evitar flashes rápidos, tremor de câmera e mudanças involuntárias de perspectiva.

## 7. Cenário, arte e áudio

Um bar compacto com estação em U: cliente à frente, pia e utensílios à esquerda, manual e ingredientes à direita, bebidas em prateleiras próximas, parede lateral e teto com pontos de evento. Todos os objetos essenciais ao alcance de uma pessoa sentada ou em pé, com altura calibrável. Testar alcance no Quest. A estação deve evitar oclusão de objetos pelo balcão e não exigir giro físico completo.

| Ato | Iluminação | Áudio | Cenário |
|---|---|---|---|
| I | Quente, estável | Jazz/ambiente suave original ou licenciado | Organizado |
| II | Pequenas alterações | Ruídos pontuais | Insetos, pistas discretas |
| III | Menos saturada, sombras mais fortes | Batimentos, música degradada | Relógio anômalo, reflexos estranhos opcionais |
| IV | Escura, luz focal suficiente para trabalhar | Ambiente silencioso e vozes inquietantes | Bar hostil, porta alterada |

Estética low-poly com materiais simples, texturas pequenas, personagens estilizados e animações idle, falar, receber e sair. Sons: despejar, gelo, misturar, pegar, confirmação, erro, insetos, porta, papel, fogo e batimentos. Usar assets com licença compatível; manter inventário de créditos. Evitar música comercial sem autorização.

## 8. Epílogo e cutscene

Sequência determinística iniciada após o 15º pedido aprovado:

1. Último cliente sai ou desaparece.
2. Porta fecha e placa muda para FECHADO.
3. Música cessa; luz focal ilumina o balcão.
4. Contrato e pena sobrenatural aparecem.
5. Jogador assina com tinta de sangue fictício (traçado simples no papel, com alternativa acessível de confirmação).
6. Contrato entra em combustão espontânea por efeito de partículas/emissividade e desaparece.
7. Batimentos desaceleram até parar.
8. Visão escurece mantendo as limitações anteriores.
9. Protagonista cai morto, representado por fade e áudio, sem queda brusca da câmera VR.
10. **Cutscene final separada**, seguida de créditos/tela de encerramento.

Texto sugerido do contrato:

> Declaro que cumpri integralmente minhas obrigações durante o expediente, atendendo a todos os pedidos apresentados. Reconheço que todos os ingredientes utilizados foram entregues voluntariamente e que nenhuma restituição será concedida. Concordo que, ao término deste turno, quaisquer partes restantes de minha existência serão transferidas ao estabelecimento. A assinatura deste documento encerra definitivamente minhas obrigações, bem como minha existência.

A cutscene ainda não tem conteúdo definido pela equipe. Implementar um placeholder substituível: fade para uma visão fixa externa do bar vazio ou placa FECHADO, seguido de créditos. Não acrescentar um novo protagonista ou explicar a origem do bar sem aprovação. Permitir pular a cutscene após seu início. Frase opcional: “Obrigado por servir até a última gota.”

## 9. Interface e acessibilidade

Menu inicial: Iniciar, Controles, Conforto, Créditos. HUD mínimo; priorizar elementos diegéticos: manual, relógio, área de entrega e diálogos. Mostrar pedido atual, progresso da preparação e feedback de erro de forma legível. Legendas com contraste e distância confortável. Pausa por menu; interromper eventos e áudio narrativo durante pausa. Aviso inicial de terror corporal fictício e alterações audiovisuais. Opções de conforto, altura, volume, legendas e interação simplificada; preservar jogabilidade com um controlador quando viável. Não depender exclusivamente de cor, áudio lateral ou vibração para informações essenciais.

## 10. Arquitetura técnica

### 10.1 Stack e execução

- HTML5 e CSS para shell e menus; JavaScript ES modules para lógica.
- A-Frame para cena, entidades, componentes, câmera e interação WebXR; Three.js já integrado ao A-Frame para recursos pontuais.
- Web Audio API para efeitos sensoriais e roteamento de áudio; iniciar contexto após gesto do usuário.
- Vite como servidor e build estático sugerido; Node.js LTS para ambiente de desenvolvimento; npm com lockfile. Fixar versão estável compatível do A-Frame após verificar documentação e testar no headset.
- WebXR exige contexto seguro: localhost em desktop e HTTPS confiável no Quest. Publicar build estático em hospedagem HTTPS. Não assumir que HTTP na rede local funciona para sessão imersiva.
- Sem banco de dados, autenticação, multiplayer ou servidor de gameplay. Configurações podem ser persistidas em localStorage; progresso de sessão em memória, checkpoint opcional posterior.

### 10.2 Estrutura sugerida

```text
/
  index.html
  package.json
  README.md
  src/
    main.js
    styles.css
    core/           # game-state, event-bus, session-controller
    data/           # ingredients, recipes, customers, acts, dialogue
    systems/        # inventory, preparation, validation, customers, narrative, audio
    components/     # grab, pour, snap, stir, shake, muddle, interactable, delivery-zone
    scene/          # bar, station, lighting, event-spawns
    ui/             # menus, recipe-book, subtitles, comfort
    finale/         # contract, signature, combustion, cutscene
  public/assets/    # models, textures, audio, credits
  tests/            # unit and integration tests
  docs/             # devlog, asset register, headset test checklist
```

Separar lógica de negócio pura dos componentes A-Frame; componentes traduzem interações para eventos de domínio. Centralizar configuração de receitas e clientes, sem duplicar IDs ou regras em HTML. Remover listeners e timers no reset; carregar assets com fallback.

### 10.3 Modelo de dados sugerido

```js
// IDs sem acentos, estáveis; quantidade lógica por ingrediente.
const recipe = {
  id: 'negroni_cockroach', name: 'Negroni com barata',
  ingredients: { gin: 1, campari: 1, sweet_vermouth: 1, ice: 1, cockroach: 1 },
  technique: 'stir', glass: 'rocks', specialEvent: 'cockroach_wall'
};
const customer = {
  id: 'gentleman', order: 5, act: 2, recipeId: 'negroni_cockroach',
  tension: 2, modelId: 'adult_male', dialogueId: 'gentleman'
};
const session = {
  phase: 'menu', customerIndex: 0, completedOrders: [],
  effects: { blood: false, eye: false, ear: false, teeth: false, finger: false },
  activeEvent: null, paused: false
};
```

Recipientes mantêm ID, mapa de ingredientes, técnica concluída, estado aberto/fechado e pose inicial. Eventos de domínio sugeridos: `customer:arrived`, `order:requested`, `ingredient:added`, `special:collected`, `effect:applied`, `drink:delivered`, `order:accepted`, `order:rejected`, `customer:left`, `act:changed`, `finale:started`, `contract:signed`, `cutscene:ended`. Eventos devem ser idempotentes onde houver risco de duplicação. Validar referências de dados ao iniciar.

### 10.4 Máquina de estados

```text
MENU → LOADING → CUSTOMER_ARRIVAL → ORDER_ACTIVE → PREPARING
 → VALIDATING → [erro: PREPARING | sucesso: CUSTOMER_EXIT]
 → [próximo cliente: CUSTOMER_ARRIVAL | último: FINALE]
 → CONTRACT → SIGNED → DEATH → CUTSCENE → CREDITS
```

Pausa é estado ortogonal. Somente o controlador de sessão avança clientes; impedir múltiplas entregas durante validação e transição. Reiniciar limpa efeitos, eventos, recipientes e atores.

## 11. Inventário de assets

| Categoria | Itens |
|---|---|
| Destilados (6) | Rum, cachaça, whisky, gin, tequila, vodka |
| Complementos (6) | Campari, vermute tinto, vermute seco, licor de laranja, licor de café, Angostura |
| Bebidas sem álcool (5) | Cola, ginger beer, suco de tomate, água tônica, água com gás |
| Básicos (6) | Limão, suco de limão, açúcar, xarope de açúcar, hortelã, gelo |
| Ambientais (3) | Barata, gosma de lesma, aranha; modelo adicional da lesma |
| Corporais fictícios (5) | Sangue, olho, orelha, dentes, dedo |
| Utensílios | Copos rocks/highball/coupe, caneca, coqueteleira, colher, macerador, pia, bandeja |
| Cenário | Balcão, prateleiras, porta, placa, relógio, luminárias, manual, contrato, pena |
| NPCs | Seis modelos-base com variantes para quinze clientes |

Total de 31 tipos lógicos de ingredientes; modelos podem ser compartilhados. Priorizar glTF/GLB, materiais simples e texturas compactas. Marcas de bebidas podem ser substituídas por rótulos fictícios. Fontes candidatas (licenças individuais devem ser verificadas): Kenney, Poly Pizza, Quaternius, Freesound e OpenGameArt. Nenhum asset externo foi selecionado ou validado neste documento.

## 12. Desempenho e testes

Meta: experiência estável no Quest 3, preferencialmente 72 FPS ou mais conforme modo suportado; medir no hardware, não prometer resultado. Limitar luzes dinâmicas e sombras, draw calls, transparência, partículas e modelos ativos. Usar iluminação pré-calculada quando possível, reuso de materiais e pooling de entidades. Evitar alocação a cada frame e loops custosos de colisão.

Testes unitários: validação de cada receita, extras/ausentes, técnica, duplicação de ingredientes, ordem de clientes, efeitos idempotentes e reset. Testes de integração: fluxo dos 15 pedidos, erro e descarte, evento ambiental perdido, pausa, troca de ato, epílogo exatamente uma vez, créditos e reinício. Testes manuais desktop e Quest: entrada/saída XR, controles de ambas as mãos, alcance sentado/em pé, legibilidade, conforto, áudio estéreo, desempenho, perda de foco e recuperação. Testar em HTTPS no dispositivo real. Relatar resultados com ambiente, data, comportamento observado e pendências.

## 13. Cronograma de cinco semanas

| Semana | Entregas | Critério de saída |
|---|---|---|
| 1 | Scaffold, cena, estação fixa, controles desktop/VR, grab e reset | Pegar/soltar objetos e acessar a estação no headset |
| 2 | Inventário, despejo, sólidos, mistura, manual e validação | Quatro primeiros clientes jogáveis sem bloqueio |
| 3 | Sistema de NPCs e diálogos, 15 receitas, eventos ambientais | Todos os pedidos percorríveis com placeholders |
| 4 | Efeitos corporais, ambiente progressivo, contrato e cutscene | Fluxo completo do menu aos créditos |
| 5 | Arte, áudio, otimização, acessibilidade, testes e documentação | Build estático funcional, bugs críticos corrigidos e teste de headset registrado |

Divisão sugerida para dupla: pessoa A — sistemas, interações e validação; pessoa B — cenário, personagens, narrativa e áudio; ambas integram e testam. Prioridade P0: loop, 15 clientes, três eventos ambientais, cinco efeitos, final, modo VR e desktop. P1: modelos finais, áudio de voz, iluminação e animações. P2: reflexos complexos, física avançada, variações de diálogo e extras. Cortar P2 antes de reduzir o fluxo principal.

## 14. Definição de pronto

- [ ] Projeto instala e executa com comandos documentados.
- [ ] Build estático inicia em desktop e abre sessão WebXR em ambiente HTTPS compatível.
- [ ] Jogador não possui locomoção artificial e todos os itens essenciais são alcançáveis.
- [ ] Os 15 clientes aparecem na ordem definida e cada receita pode ser concluída.
- [ ] Pedidos errados são recuperáveis sem reiniciar a sessão.
- [ ] Os três eventos ambientais funcionam e possuem recuperação.
- [ ] Cinco efeitos corporais fictícios persistem e não bloqueiam gameplay.
- [ ] Curva de terror preserva os retornos à normalidade.
- [ ] Contrato assinado, combustão, morte, cutscene e créditos acontecem em sequência.
- [ ] Opções de conforto e legendas funcionam.
- [ ] Reinício restaura estado inicial.
- [ ] Testes, desempenho observado e licenças de assets estão documentados.

## 15. Decisões abertas e premissas

Título, horários exatos, duração, estética final, dosagem lógica, atalhos desktop e divisão de trabalho são propostas para implementação inicial. Conteúdo da cutscene permanece aberto. Não há repositório, assets finais ou medições de desempenho fornecidos neste momento; não tratar a estrutura sugerida como código já existente. A versão do A-Frame e as dependências precisam ser verificadas no início da implementação. Os efeitos de terror corporal foram especificados como abstrações ficcionais e as limitações sensoriais foram adaptadas para conforto e acessibilidade em VR.

## 16. Primeiro comando de trabalho para o Codex

Leia este arquivo integralmente, examine o repositório e implemente o MVP em etapas. Comece pelo scaffold, cena fixa e um vertical slice do primeiro cliente com controles desktop e VR, ingredientes, preparo, validação e avanço de estado. Depois expanda o sistema orientado a dados para todos os clientes, eventos e epílogo. Execute testes a cada etapa e mantenha documentação atualizada. Se algum asset não existir, use placeholder funcional. Não interrompa a implementação por decisões cosméticas abertas: mantenha defaults configuráveis e registre-os. Entregue código executável, não apenas um plano ou pseudocódigo.
