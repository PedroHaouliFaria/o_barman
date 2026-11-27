# Conversa de bar ao fundo (walla) · v1

27/11/2026. Três loops de conversa, um por mesa do salão, para tocar em áudio posicional, mais baixo que o piano.

| Arquivo | Mesa | Vozes | Duração |
|---|---|---|---|
| `public/audio/conversa_mesa1.ogg` | 1 | dois homens e uma mulher (Rafa, Beto, Lu) | 62,0 s |
| `public/audio/conversa_mesa2.ogg` | 2 | duas amigas (Carol, Nanda) | 62,0 s |
| `public/audio/conversa_mesa3.ogg` | 3 | casal mais velho (Seu Zé, Dona Inês) | 62,0 s |

Formato: mono, 48 kHz, Opus 40 kbps, cerca de -20 LUFS integrado (medido com `ebur128`), pico abaixo de 0 dBFS, ~310 KB cada. O fim emenda no começo: os últimos 2,5 s gerados entram por cima do começo com fade de potência igual, então o loop não tem clique.

## Como foi gerado

Script: `art/audio/gerar_conversa.py` (o roteiro das falas está dentro dele; semente fixa).

1. **TTS**: [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) (pacote `kokoro` 0.9.4), local, na RTX 4070 do Windows (`simaonote`, `C:\barman\audio`). Vozes pt-BR: `pf_dora`, `pm_alex`, `pm_santa`. O Kokoro só tem uma voz feminina pt-BR, então as outras mulheres são misturas ponderadas do estilo de voz (`pf_dora` com `af_bella`, `if_sara`, `ef_dora`), ainda faladas pelo fonemizador pt-BR; o casal mais velho usa tom mais grave e fala mais devagar.
2. **Montagem** (numpy/scipy): falas alternando, pausas de 0,2 a 1,5 s, 25% das vezes uma fala atravessa a anterior, ganho e velocidade variando por fala, leve deslocamento de tom. Uma segunda camada bem baixa (-13 dB, abafada a 2,2 kHz) com as mesmas falas em outra ordem faz o burburinho de vozes sobrepostas.
3. **Sala**: reverb de sala pequena (resposta ao impulso sintética de 0,45 s), passa-baixa de 5 kHz e passa-alta de 120 Hz, para soar "do outro lado do salão". Sem música.
4. **Saída**: ganho linear até -20 LUFS (não comprime, não estraga o loop), limitador de segurança, Opus pelo ffmpeg.

Conferido com Whisper (small, pt): as falas saem em português claro antes da distância do jogo; no jogo, com o posicional e o piano por cima, viram burburinho.

Roteiro: 58 falas mundanas (demissão, futebol, saideira, mensagem da ex-amiga, mudança, netos) com três frases levemente estranhas perdidas no meio: "Ele sempre senta ali. Toda noite. Desde aquela vez." (mesa 1), o vizinho de cima que arrasta móvel num apartamento vazio há um ano (mesa 2), e o pianista que "não envelheceu um dia" em quarenta anos e "o tempo passa rápido demais lá fora" (mesa 3).

Sem risadas: o Kokoro não gera risada convincente, e risada sintetizada mal soaria robótica.

## Licenças

- Kokoro-82M (pesos e vozes): **Apache 2.0**. Permite uso, modificação e distribuição, inclusive comercial; serve para o projeto da faculdade. Segundo o cartão do modelo, foi treinado em dados de domínio público ou com licença permissiva, sem clonagem de vozes de pessoas reais.
- Pacotes `kokoro` e `misaki`: Apache 2.0. O espeak-ng (fonemização pt-BR, GPL v3) é só ferramenta de geração; nada dele vai para o jogo.
- Roteiro, montagem e áudios: do projeto.

## Como regenerar

```sh
# do Mac, na raiz do repositório
tar czf - -C art/audio gerar_conversa.py | ssh simaonote "tar xzf - -C C:/barman/audio"
ssh simaonote "C:/barman/audio/venv/Scripts/python C:/barman/audio/gerar_conversa.py C:/barman/audio/saida"   # ~40 s
scp "simaonote:C:/barman/audio/saida/conversa_mesa*.ogg" public/audio/
```

O venv (`C:\barman\audio\venv`) já está instalado; para montar do zero, veja o topo do script (precisa de `torch>=2.6` com CUDA). Para mudar as falas ou as vozes, edite `MESAS` e `VOZES` no script. Pelo acervo total, uma versão nova dos áudios deve sair com outro nome (`conversa_mesa1_v2.ogg`) e uma nota `audio_conversa_v2.md`.
