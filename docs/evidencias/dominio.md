# Registro técnico das regras de preparo

**Execução D-001 · 24/11/2026 · Darwin arm64 · Node.js v24.13.0**

Comando na raiz do projeto: `node --test tests/domain.test.js`. O teste chama a mesma API de sessão utilizada pelos controles do jogo. A execução começou com uma sessão nova por caso. **12 passaram, 0 falharam, 0 foram ignorados; código de saída 0.** Duração relatada pelo executor: 87,38 ms. Os estímulos e as asserções podem ser reproduzidos no [arquivo de testes](../../tests/domain.test.js).

| Caso | Estímulo | Resultado observado |
|---|---|---|
| DOM-01 | Ler o catálogo do protótipo | Os três clientes, bebidas, ingredientes, quantidades e copos corresponderam às expectativas. Gelo e xarope receberam as categorias sólido e líquido. |
| DOM-02 | Servir os três pedidos em ordem e repetir a última entrega | A sessão terminou com três aprovações. O gelo permaneceu registrado na transferência. A transferência e a entrega repetidas foram recusadas. |
| DOM-03 | Omitir cola, duplicar rum, acrescentar açúcar e entregar | A mensagem identificou as três diferenças. Após lavar o copo e preparar a receita completa, a Turista chegou. A entrega imediata do copo vazio manteve o segundo pedido ativo. |
| DOM-04 | Preparar Cuba Libre no Rocks e tentar trocar o copo cheio | A entrega pediu Highball. A troca foi bloqueada e a dose de rum permaneceu. A lavagem permitiu trocar o copo e acertar o pedido. |
| DOM-05 | Macerar só o limão; completar a caipirinha e tentar entregar antes de macerar | A sessão recusou ambas as tentativas. Após macerar com açúcar, a entrega avançou e a marca de maceração foi limpa. |
| DOM-06 | Agitar com tampa aberta, agitar sem conteúdo, inserir e transferir com tampa fechada | A sessão recusou os comandos, preservou o conteúdo e permitiu a transferência após a agitação e a abertura. |
| DOM-07 | Adicionar o gelo após a agitação, na coqueteleira ou diretamente no copo | Os dois Whiskey Sour foram recusados por técnica incompleta. |
| DOM-08 | Lavar o copo macerado e depois a coqueteleira fechada e agitada | Cada lavagem limpou apenas o utensílio escolhido. A coqueteleira voltou aberta e a Turista continuou à espera. |
| DOM-09 | Durante a pausa, entregar, acrescentar rum e lavar | As três ações foram bloqueadas. A entrega foi aprovada após a retomada, com o preparo preservado. |
| DOM-10 | Tentar adicionar no menu; reiniciar durante uma pausa no segundo pedido | O menu bloqueou a ação. O reinício reproduziu o estado de abertura com o Executivo, bancada limpa e zero aprovações. |
| DOM-11 | Enviar IDs de ingrediente, recipiente, copo e ação desconhecidos | A sessão recusou os comandos; copo e coqueteleira permaneceram vazios. |
| DOM-12 | Transferir para um copo ocupado; montar o Cuba Libre na coqueteleira | O primeiro comando preservou o conteúdo na coqueteleira. Após transferir para um copo vazio, a validação apontou a necessidade de montar diretamente no copo. |

As recusas intencionais da tabela são resultados esperados dos controles negativos. Esta rodada não produziu falhas de asserção ou correções de domínio. Tracking, imersão WebXR, estabilidade de quadros, esforço físico, legibilidade e experiência do jogador exigem evidências separadas. Reexecutar a suíte após mudanças no catálogo, nas regras de preparo ou no ciclo da sessão e acrescentar uma nova entrada ao histórico.

## Ampliação para nove pedidos · 24/11/2026

Ambiente das duas rodadas: Darwin arm64, Node.js v24.13.0. Comando executado na raiz: `node --test tests/domain.test.js`.

| Execução | Versão do cenário | Resultado observado | Tratamento |
|---|---|---|---|
| D-002 | Catálogo ampliado; expectativas da amostra anterior | **11 passaram e 2 falharam** em 77,98 ms, saída 1. DOM-01 esperava três entradas e recebeu nove. DOM-02 esperava sessão encerrada após Whiskey Sour e recebeu estado ativo com a Festeira. | Atualizadas as expectativas da ordem e da última entrega para o novo recorte. Mantidos os casos de erro, lavagem, pausa, transferência e reinício. |
| D-003 | Catálogo, progressão, técnicas e coleta ambiental atualizados | **19 passaram, 0 falharam e 0 ignorados** em 75,26 ms, saída 0. | O domínio aceitou os nove pedidos até o Martini com aranha. O roteiro humano continua pendente no headset. |

| Casos da rodada D-003 | Estímulo e resultado observado |
|---|---|
| DOM-01 e DOM-02 | Os pedidos originais 1–8 e 10, com ingredientes, atos, eventos, copos e técnicas especificados, passaram na sequência. Entregas vazias mantiveram o horário e o cliente. A última aprovação encerrou a amostra às 00h30. |
| DOM-03 a DOM-12 e caso da Caipirinha na Coupe | Permaneceram recuperáveis as tentativas inválidas da primeira amostra. A Turista recusou a Caipirinha no copo errado. |
| ENV-5, ENV-8, ENV-10 | Para cada espécie, adicionar antes de coletar e repetir a coleta falhou conforme esperado. Descartar o item coletado permitiu buscá-lo de novo. Colocar em coqueteleira fechada preservou o item. A pia reabriu a fonte ambiental apenas ao lavar o recipiente que continha o ingrediente, inclusive após transferência. As três receitas foram entregues depois da recuperação. |
| ENV-0 | Coleta de evento fora do pedido, inserção de ingrediente especial indisponível e captura durante pausa foram recusadas. Reiniciar depois da captura zerou o evento e as aprovações. |
| DOM-13 | Uma dose colocada depois da mistura invalidou a técnica. A Detetive recusou o Dry Martini até que a colher fosse usada novamente. |
| ENV-REC | Ao lavar a coqueteleira contendo gosma, o Homem Encharcado permaneceu às 23h45 e a coleta reapareceu. |

As asserções de coleta exercitam disponibilidade, consumo e recuperação no estado do jogo. O percurso da barata, a deposição de gosma, a descida da aranha e a legibilidade do retorno ao jogador precisam também de execução da cena.
