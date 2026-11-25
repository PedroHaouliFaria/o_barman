# Resultados da validação humana

**Situação de abertura em 24/11/2026.** Os casos de desktop e de Meta Quest 3 físico aguardam execução pelo participante. Os critérios e os procedimentos estão no [plano de testes](plano-de-testes.md). Os testes automatizados possuem [evidências técnicas próprias](evidencias/).

Em 24/11/2026, a expansão para nove pedidos acrescentou D-07 a D-10 e Q-08. Os critérios de D-05 e Q-04 passaram a observar a chegada da Festeira após o Whiskey Sour. O encerramento e o reinício agora são verificados em D-10. Ao relacionar uma tentativa antiga, identifique a versão e o tamanho da amostra.

## Controle de cobertura

Atualize a coluna “última execução” com o ID do registro correspondente ao realizar cada caso. Se houver retestes, mantenha o primeiro registro e todos os seguintes no histórico abaixo.

| Caso | Ambiente | Estado atual | Última execução |
|---|---|---|---|
| D-01 · orientação e leitura | Desktop | Pendente de validação humana | |
| D-02 · interação com a cena | Desktop | Pendente de validação humana | |
| D-03 · quantidades, tipo de copo e pia | Desktop | Pendente de validação humana | |
| D-04 · maceração e manual | Desktop | Pendente de validação humana | |
| D-05 · coqueteleira e chegada da Festeira | Desktop | Pendente de validação humana | |
| D-06 · pausa, foco e som | Desktop | Pendente de validação humana | |
| D-07 · barata, recuperação e uso da colher | Desktop | Pendente de validação humana | |
| D-08 · retorno a dois atendimentos comuns | Desktop | Pendente de validação humana | |
| D-09 · lesma, pausa, coleta e devolução da gosma | Desktop | Pendente de validação humana | |
| D-10 · aranha, mistura final e reinício | Desktop | Pendente de validação humana | |
| Q-01 · sessão imersiva e retorno | Meta Quest 3 físico | Pendente de execução no dispositivo | |
| Q-02 · alcance e calibração | Meta Quest 3 físico, sentado e em pé | Pendente de execução no dispositivo | |
| Q-03 · dosagem, sólidos e macerador | Meta Quest 3 físico | Pendente de execução no dispositivo | |
| Q-04 · agitar, abrir, transferir e servir | Meta Quest 3 físico | Pendente de execução no dispositivo | |
| Q-05 · leitura e pistas visuais | Meta Quest 3 físico, sentado e em pé | Pendente de execução no dispositivo | |
| Q-06 · operação com uma mão por vez | Meta Quest 3 físico, esquerda e direita | Pendente de execução no dispositivo | |
| Q-07 · desempenho e conforto | Meta Quest 3 físico | Pendente de execução no dispositivo | |
| Q-08 · fontes ambientais, descarte, lavagem e recolha | Meta Quest 3 físico, sentado e em pé | Pendente de execução no dispositivo | |

## Como registrar uma sessão

Anote um identificador do participante à sua escolha, a data, o horário, a versão testada (commit ou cópia identificada), o sistema, o navegador e suas versões. No Quest, inclua versão do software do headset, postura, controles usados, URL/protocolo de acesso, taxa de atualização configurada e ferramenta de medição, quando disponível. No desktop, inclua resolução e forma de entrada. Evite inserir certificados, chaves, informações pessoais e outros dados particulares nas evidências.

Use **Aprovado** quando o resultado esperado foi observado integralmente, **Falhou** quando o comportamento divergiu e **Bloqueado** quando um pré-requisito impediu a execução. Uma tentativa interrompida por desconforto pode ser registrada como **Interrompido** com o ponto de parada. Uma execução positiva também pode ter observações ou melhorias. Caso não tenha sido possível medir FPS, escreva “sem medição” no resultado do teste correspondente. Guarde arquivos de evidência que desejar associar sob `docs/evidencias/` e cite o caminho ou identificador.

### Ambiente da sessão · modelo para copiar

| Campo | Preencher na execução |
|---|---|
| ID da sessão e participante | |
| Data, hora e versão do projeto | |
| Dispositivo, SO, navegador e versões | |
| Resolução desktop ou taxa configurada no headset | |
| Localhost ou endereço HTTPS e estado da conexão | |
| Postura, altura recalibrada, mão(s), interação física/assistida | |
| Áudio, ferramenta de métricas e condições relevantes | |

### Tentativa de um caso · modelo para copiar

Crie uma ficha para cada combinação de caso, postura ou mão que produza resultado diferente. Se as duas condições forem aprovadas juntas, registre explicitamente ambas. Use o campo de execução anterior para vincular uma reprodução ou um reteste à observação original.

| Campo | Preencher durante/depois da tentativa |
|---|---|
| ID da execução, sessão e caso do plano | |
| Primeira execução, reprodução ou reteste; ID anterior | |
| Objetivo, hipótese e referência ao critério do plano | |
| Pré-condições observadas, procedimento e variações | |
| Resultado esperado do caso | |
| Resultado obtido, mensagem exibida e etapa exata | |
| Status da tentativa | |
| Problemas encontrados, frequência e possibilidade de reproduzir | |
| Esforço, legibilidade, alcance ou conforto relatados | |
| Métricas reais, instrumento, duração e unidade, quando aplicável | |
| Evidência ou descrição suficiente para repetir | |
| Possíveis melhorias | |
| Necessidade de reteste, ID da falha e justificativa | |

## Histórico de execuções e retestes

Acrescente uma linha por tentativa e a respectiva ficha preenchida ao final do documento.

| Execução | Sessão/data | Caso | Versão | Status | Evidência | Execução anterior |
|---|---|---|---|---|---|---|

## Histórico de problemas, correções e verificações

Acrescente uma linha ao reproduzir, corrigir ou verificar um problema. Identificadores como `F-001` podem ser reutilizados em linhas sucessivas para acompanhar o mesmo defeito. Em uma correção, identifique a versão ou o arquivo alterado e a tentativa que deve ser repetida; no reteste, descreva o resultado real.

| Falha | Data | Evento | Caso/execução | Observação ou correção | Versão | Evidência | Reteste vinculado |
|---|---|---|---|---|---|---|---|
