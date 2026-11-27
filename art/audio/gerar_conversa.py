"""Conversa de bar ao fundo (walla) das 3 mesas do salão. On the House.

Gera public/audio/conversa_mesa1.ogg, conversa_mesa2.ogg e conversa_mesa3.ogg:
mono, 48 kHz, Opus ~40 kbps, ~60 s cada, loop sem clique, cerca de -20 LUFS.

TTS: Kokoro-82M (Apache 2.0), vozes pt-BR pf_dora, pm_alex, pm_santa; as vozes
extras são misturas ponderadas dessas com vozes femininas de outras línguas
(o sotaque continua o do fonemizador pt-BR) mais um leve deslocamento de tom.

Como rodar (o pesado vai para o Windows, simaonote, RTX 4070):

    # 1) do Mac, mandar o script
    tar czf - -C art/audio gerar_conversa.py | ssh simaonote "tar xzf - -C C:/barman/audio"
    # 2) no Windows (uma vez): venv com o Kokoro
    #    python -m venv C:/barman/audio/venv
    #    C:/barman/audio/venv/Scripts/pip install "torch>=2.6" --index-url https://download.pytorch.org/whl/cu124
    #    C:/barman/audio/venv/Scripts/pip install kokoro soundfile numpy scipy
    # 3) gerar (~1 min com GPU; baixa o modelo do Hugging Face na 1a vez)
    ssh simaonote "C:/barman/audio/venv/Scripts/python C:/barman/audio/gerar_conversa.py C:/barman/audio/saida"
    # 4) trazer só os .ogg
    scp "simaonote:C:/barman/audio/saida/conversa_mesa*.ogg" public/audio/

Precisa de ffmpeg no PATH (normalização de loudness e codificação Opus).
A semente é fixa: rodar de novo dá o mesmo resultado (salvo mudanças do modelo).
"""

import json
import os
import random
import subprocess
import sys

import numpy as np
import soundfile as sf
import torch
from scipy.signal import butter, fftconvolve, resample_poly, sosfilt

SR_TTS = 24000          # saída do Kokoro
SR = 48000              # saída final
DURACAO = 62.0          # segundos de cada loop
XFADE = 2.5             # crossfade do fim com o começo
LUFS = -20.0
SEMENTE = 1977

# ---------------------------------------------------------------------------
# Vozes. Cada uma: lista de (voz_kokoro, peso), deslocamento de tom em
# semitons (via reamostragem, também muda um pouco o andamento) e velocidade.
# ---------------------------------------------------------------------------
VOZES = {
    # mesa 1: dois homens e uma mulher (trinta e poucos)
    "rafa":   dict(mix=[("pm_alex", 1.0)], tom=0.0, vel=1.08),
    "beto":   dict(mix=[("pm_santa", 0.75), ("pm_alex", 0.25)], tom=-1.2, vel=1.0),
    "lu":     dict(mix=[("pf_dora", 1.0)], tom=0.3, vel=1.06),
    # mesa 2: duas amigas
    "carol":  dict(mix=[("pf_dora", 0.6), ("af_bella", 0.4)], tom=0.8, vel=1.1),
    "nanda":  dict(mix=[("pf_dora", 0.55), ("if_sara", 0.45)], tom=-0.6, vel=1.02),
    # mesa 3: casal mais velho (mais grave e mais devagar)
    "seu_ze": dict(mix=[("pm_santa", 1.0)], tom=-2.2, vel=0.9),
    "dona_ines": dict(mix=[("pf_dora", 0.65), ("ef_dora", 0.35)], tom=-1.6, vel=0.88),
}

# ---------------------------------------------------------------------------
# Roteiro. (quem, fala). Mundano, com uma ou duas frases levemente estranhas.
# ---------------------------------------------------------------------------
MESAS = {
    "mesa1": [
        ("rafa", "Não, mas escuta, o cara pediu demissão na sexta, do nada."),
        ("beto", "Do nada? Ninguém pede demissão do nada."),
        ("lu", "Ah, eu sabia. Ele tava estranho fazia umas semanas."),
        ("rafa", "Pede mais uma pra mim? Essa aqui já esquentou."),
        ("beto", "E o jogo de domingo, hein? Que vergonha."),
        ("lu", "Ai, não, futebol não, por favor."),
        ("rafa", "Dois a zero em casa, Lu. Em casa!"),
        ("beto", "O técnico não dura até o fim do mês, anota aí."),
        ("lu", "Gente, vocês viram aquele cara no balcão?"),
        ("rafa", "Qual? O de terno?"),
        ("lu", "É. Ele sempre senta ali. Toda noite. Desde aquela vez."),
        ("beto", "Que vez?"),
        ("lu", "Nada, esquece. Bobagem minha."),
        ("rafa", "Amanhã eu tenho reunião às oito, eu tô ferrado."),
        ("beto", "Então pede logo a saideira."),
        ("lu", "Saideira é a terceira que você fala isso hoje."),
        ("rafa", "Mas dessa vez é sério, juro."),
        ("beto", "Fala com o chefe, ele te dá a folga, ele te deve uma."),
        ("lu", "Ele não deve nada pra ninguém, aquele lá."),
        ("rafa", "Tá, tá bom. Quem vai pagar essa rodada?"),
    ],
    "mesa2": [
        ("carol", "Amiga, você não vai acreditar no que ela me mandou."),
        ("nanda", "Mostra, mostra! Ai, não acredito."),
        ("carol", "Pois é. Depois de três meses sem falar nada."),
        ("nanda", "E você respondeu o quê?"),
        ("carol", "Nada ainda. Visualizei e deixei lá."),
        ("nanda", "Fez certo. Deixa ela esperar um pouquinho."),
        ("carol", "Esse drink tá bom demais, prova."),
        ("nanda", "Hum, tem gengibre? Eu adorei."),
        ("carol", "Acho que tem. Vou pedir outro igual."),
        ("nanda", "E o apartamento novo, já mudou?"),
        ("carol", "Semana que vem. Tá tudo em caixa ainda."),
        ("nanda", "Ai, que preguiça de mudança."),
        ("carol", "O vizinho de cima arrasta móvel de madrugada."),
        ("nanda", "Todo prédio tem um desses."),
        ("carol", "Só que o apartamento de cima tá vazio. Faz um ano."),
        ("nanda", "Para, Carol. Para com isso."),
        ("carol", "Tô brincando, boba. Deve ser cano."),
        ("nanda", "Muda de assunto. Como foi a entrevista?"),
        ("carol", "Acho que fui bem, eles ficaram de ligar."),
        ("nanda", "Vai dar certo, vai sim. Saúde!"),
    ],
    "mesa3": [
        ("seu_ze", "Esse lugar não mudou nada, né, Inês?"),
        ("dona_ines", "Nada. A mesma luz, o mesmo cheiro de madeira."),
        ("seu_ze", "A gente vinha aqui quando era namorado."),
        ("dona_ines", "Você pedia sempre a mesma coisa."),
        ("seu_ze", "E ainda peço. Pra que mudar?"),
        ("dona_ines", "O pianista é outro, mas a música é a mesma."),
        ("seu_ze", "Será? Eu acho que é o mesmo."),
        ("dona_ines", "Não pode ser, Zé. Já faz quarenta anos."),
        ("seu_ze", "Pois olha bem pra ele. Não envelheceu um dia."),
        ("dona_ines", "Bebe a tua água, vai, que o médico mandou."),
        ("seu_ze", "O médico não manda aqui dentro."),
        ("dona_ines", "A Clarinha ligou hoje, mandou um beijo."),
        ("seu_ze", "E as crianças? Tão grandes já, imagino."),
        ("dona_ines", "Enormes. O menor já tá na escola."),
        ("seu_ze", "O tempo passa rápido demais lá fora."),
        ("dona_ines", "Lá fora? Que jeito de falar, Zé."),
        ("seu_ze", "Ah, você entendeu. Pede a conta pra mim?"),
        ("dona_ines", "Ainda não. Fica mais um pouquinho comigo."),
    ],
}


def carregar_voz(pipe, mix):
    """Mistura ponderada dos tensores de estilo do Kokoro."""
    total = sum(p for _, p in mix)
    return sum(pipe.load_voice(nome) * (p / total) for nome, p in mix)


def sintetizar(pipe, texto, voz, vel):
    partes = [r.audio.cpu().numpy() for r in pipe(texto, voice=voz, speed=vel)
              if r.audio is not None]
    return np.concatenate(partes).astype(np.float32)


def aparar(x, limiar=0.01):
    idx = np.where(np.abs(x) > limiar)[0]
    if len(idx) == 0:
        return x
    a = max(idx[0] - int(0.02 * SR), 0)
    b = min(idx[-1] + int(0.08 * SR), len(x))
    return x[a:b]


def mudar_tom(x, semitons):
    """Reamostra para 48 kHz já deslocando o tom (efeito 'fita', muda andamento)."""
    fator = 2 ** (semitons / 12.0)
    # x está a 24 kHz; tocar a 48 kHz * fator -> reamostrar por 2/fator
    up, down = int(round(2000 / fator)), 1000
    return resample_poly(x, up, down).astype(np.float32)


def sala_pequena(rng, segundos=0.45):
    """Resposta ao impulso sintética: reflexões iniciais + cauda exponencial."""
    n = int(segundos * SR)
    t = np.arange(n) / SR
    cauda = rng.standard_normal(n) * np.exp(-t * 6.9 / segundos)
    cauda = sosfilt(butter(2, 3500, "low", fs=SR, output="sos"), cauda)
    ir = 0.35 * cauda / np.max(np.abs(cauda))
    ir[0] = 1.0
    for atraso, ganho in [(0.007, 0.5), (0.013, 0.35), (0.021, 0.28), (0.034, 0.2)]:
        ir[int(atraso * SR)] += ganho
    return ir


def montar_mesa(nome, falas_audio, rng, embaralhar=False, inicio=0.3):
    """Põe as falas numa linha do tempo, com pausas e sobreposições."""
    alvo = DURACAO + XFADE
    buf = np.zeros(int((alvo + 30) * SR), dtype=np.float32)
    t = inicio
    i = 0
    ordem = list(range(len(falas_audio)))
    if embaralhar:
        rng.shuffle(ordem)
    while t < alvo:
        _quem, audio = falas_audio[ordem[i % len(ordem)]]
        i += 1
        ganho = 10 ** (rng.uniform(-3.5, 1.0) / 20)
        a = int(t * SR)
        buf[a:a + len(audio)] += audio * ganho
        dur = len(audio) / SR
        r = rng.random()
        if r < 0.25:        # alguém atravessa a fala do outro
            gap = -rng.uniform(0.25, min(0.9, dur * 0.4))
        elif r < 0.35:      # resposta colada
            gap = rng.uniform(0.0, 0.2)
        else:
            gap = rng.uniform(0.2, 1.5)
        t += dur + gap
    buf = buf[:int(alvo * SR)]
    return buf


def loop_sem_clique(x):
    """Último XFADE segundos entram por cima do começo (fade de potência igual)."""
    n = int(DURACAO * SR)
    k = int(XFADE * SR)
    corpo = x[:n].copy()
    cauda = x[n:n + k]
    f = np.linspace(0, np.pi / 2, k)
    corpo[:k] = corpo[:k] * np.sin(f) + cauda * np.cos(f)
    return corpo


def medir_lufs(wav):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", wav, "-af",
                        "loudnorm=print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    txt = r.stderr
    return json.loads(txt[txt.rindex("{"):txt.rindex("}") + 1])


def main():
    saida = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "saida")
    os.makedirs(saida, exist_ok=True)
    random.seed(SEMENTE)
    np.random.seed(SEMENTE)
    torch.manual_seed(SEMENTE)

    from kokoro import KPipeline
    dispositivo = "cuda" if torch.cuda.is_available() else "cpu"
    pipe = KPipeline(lang_code="p", repo_id="hexgrad/Kokoro-82M", device=dispositivo)
    vozes = {q: carregar_voz(pipe, v["mix"]) for q, v in VOZES.items()}

    passa_baixa = butter(4, 5000, "low", fs=SR, output="sos")
    passa_alta = butter(2, 120, "high", fs=SR, output="sos")

    for m, (nome, roteiro) in enumerate(MESAS.items()):
        rng = np.random.default_rng(SEMENTE + m)
        falas = []
        for quem, texto in roteiro:
            cfg = VOZES[quem]
            vel = cfg["vel"] * rng.uniform(0.94, 1.06)
            a = sintetizar(pipe, texto, vozes[quem], vel)
            a = aparar(a)
            a = mudar_tom(a, cfg["tom"] + rng.uniform(-0.4, 0.4))
            a = a / (np.sqrt(np.mean(a ** 2)) + 1e-9) * 0.08   # nível parecido entre falas
            falas.append((quem, a))
        seco = montar_mesa(nome, falas, rng)
        # segunda camada bem baixa e abafada (mesma mesa, outra ordem):
        # dá o "burburinho" de vozes sobrepostas sem virar duas conversas claras
        fundo = montar_mesa(nome, falas, rng, embaralhar=True, inicio=rng.uniform(1.0, 2.5))
        fundo = sosfilt(butter(2, 2200, "low", fs=SR, output="sos"), fundo)
        seco = seco + 0.22 * fundo
        molhado = fftconvolve(seco, sala_pequena(rng))[:len(seco)]
        x = 0.55 * seco + 0.45 * molhado / (np.max(np.abs(molhado)) / max(np.max(np.abs(seco)), 1e-9))
        x = sosfilt(passa_alta, sosfilt(passa_baixa, x))
        x = loop_sem_clique(x)
        x = x / np.max(np.abs(x)) * 0.5
        wav = os.path.join(saida, f"conversa_{nome}.wav")
        sf.write(wav, x.astype(np.float32), SR, subtype="FLOAT")

        # loudness em uma passagem medida + ganho linear (não mexe no loop)
        med = medir_lufs(wav)
        ganho_db = LUFS - float(med["input_i"])
        ogg = os.path.join(saida, f"conversa_{nome}.ogg")
        subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", wav,
                        "-af", f"volume={ganho_db:.2f}dB,alimiter=limit=0.89:level=false",
                        "-ac", "1", "-ar", str(SR), "-c:a", "libopus", "-b:a", "40k",
                        "-application", "audio", ogg], check=True)
        print(f"{nome}: {len(roteiro)} falas, entrada {med['input_i']} LUFS, ganho {ganho_db:+.1f} dB -> {ogg}")


if __name__ == "__main__":
    main()
