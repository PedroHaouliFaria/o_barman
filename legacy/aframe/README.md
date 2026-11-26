# Spirits & Spirits

Um jogo de bartender em primeira pessoa. O turno começa com clientes comuns, um manual de receitas e um posto fixo atrás do balcão. O protótipo percorre nove atendimentos e introduz a primeira estranheza do turno. A primeira entrega acadêmica e seus resultados estão preservados em [Entrega 01](docs/entrega-01.md).

## Abrir no desktop

Na raiz deste repositório, com Python 3 instalado, execute:

```sh
python3 -m http.server 8187 --bind 127.0.0.1 --directory public
```

Abra [o balcão no navegador](http://127.0.0.1:8187) e clique em um ingrediente para iniciar o turno com ele na mão. Você também pode usar **Iniciar turno** na barra superior ou a placa **Iniciar** da estação. A cena ocupa a janela abaixo da barra superior. Use **Tela cheia** para expandir também o navegador ou **Caderno** para abrir os controles assistidos. Use um navegador com WebGL 2 habilitado. Com Node.js e npm instalados, `npm start` inicia o mesmo servidor. A distribuição do A-Frame já está no repositório. A pasta `public/` inteira pode ser servida estaticamente, sem etapa de build.

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

O Quest deve abrir um endereço HTTPS cujo certificado seja aceito pelo navegador. O endereço localhost do computador serve ao teste desktop. Existem dois caminhos para o ensaio físico. [WebXR e execução local no A-Frame](https://aframe.io/faq/)

1. **Hospedagem já disponível com HTTPS confiável.** Sirva o conteúdo completo da pasta `public/` na hospedagem de sua escolha e abra a URL no Meta Quest Browser. Esta entrega fornece o site estático para esse uso.
2. **Caddy 2 na rede local.** Conecte computador e headset à mesma rede. Na raiz do projeto, substitua o IP do exemplo pelo endereço LAN do computador. No macOS com Wi-Fi em en0, `ipconfig getifaddr en0` mostra o endereço.

   ```sh
   BAR_HOST=192.168.1.42 caddy run --config Caddyfile
   ```

   O Caddy serve em `https://192.168.1.42:8443` nesse exemplo. Libere a porta TCP 8443 para a rede de teste se o firewall a bloquear. A configuração usa a autoridade local do Caddy e mantém a instalação de confiança manual. Localize o diretório de dados com `caddy environ`, campo `caddy.AppDataDir`. O certificado **público** da raiz está em `pki/authorities/local/root.crt` dentro desse diretório. Use o procedimento de instalação de CA de usuário disponível na versão/gestão do seu headset para confiar nesse certificado. A página deve abrir sem alerta. Se o navegador do headset não aceitar uma CA local, use a opção de hospedagem com certificado público. [HTTPS local no Caddy](https://caddyserver.com/docs/automatic-https#local-https)

No navegador do headset escolha **Entrar em VR**. Use a placa **Iniciar** se o turno ainda estiver no menu e ajuste **Altura**. As verificações de mãos, tracking, alcance, conforto, cadência de quadros e retorno da sessão precisam ser executadas no aparelho físico.

## Testes técnicos

Utilize Node.js 22 ou superior e Python 3. O teste de navegador usa o pacote de desenvolvimento fixado no lockfile. Com o Chrome ou Chromium instalado:

```sh
npm ci
npm test
npm run test:browser
caddy validate --config Caddyfile
```

O ensaio de navegador inicia um servidor local temporário em porta livre. Procura Chrome no caminho padrão do macOS e Chrome/Chromium em caminhos usuais do Linux. Em outras instalações, aponte `CHROME_BIN` para o executável. `BAR_TEST_URL` permite testar um servidor já iniciado. `BAR_EVIDENCE_DIR` grava as capturas da rodada em um diretório escolhido. Use um diretório novo por rodada para preservar o histórico.

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
Caddyfile                            Servidor HTTPS estático
README.md                            Execução e materiais da entrega
DEVLOG_SPIRITS_AND_SPIRITS_CODEX.md   Especificação original
public/
  index.html, style.css              Página, comandos e apresentação
  js/main.js, js/audio.js            Integração, HUD e áudio sintetizado
  js/domain/                         Clientes, ingredientes, receitas e sessão
  js/components/                     Ponte entre mouse, gestos XR e comandos
  js/scene/                          Construção do bar, placas e objetos
  assets/                            Reservado para assets do jogo
  vendor/aframe/                     Runtime A-Frame 1.8.0 e licença MIT
scripts/                             Verificação de integração com navegador
tests/                               Testes unitários e de fluxo em Node.js
docs/                                Planejamento, registros, ficha e moodboard
```

A cena usa HTML, JavaScript em módulos, A-Frame/WebXR e primitivas de cor sólida. Web Audio produz sinais curtos de confirmação e erro. O navegador carrega a cópia local do [runtime oficial do A-Frame](https://aframe.io/releases/1.8.0/aframe.min.js). A licença acompanha a [distribuição local](public/vendor/aframe/LICENSE).

## Estado atual

Há nove dos quinze clientes previstos. Os seis pedidos restantes são os de números 9 e 11–15 do devlog. Ingredientes corporais fictícios, efeitos sensoriais cumulativos, ambientação completa dos quatro atos, contrato e cutscene permanecem no backlog. A estação usa doses lógicas e encaixes de preparo. Os objetos arremessados usam corpos rígidos do cannon-es 0.20.0, incluído em public/vendor/cannon-es com a licença MIT. O progresso fica na memória da página. A duração da versão final, o desempenho físico no Quest 3 e a ergonomia seguem sem medição. Nomes e responsabilidades dos integrantes aguardam definição da equipe.
