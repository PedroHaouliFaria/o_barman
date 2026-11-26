#!/usr/bin/env bash
# Gera todos os modelos no Windows (simaonote, Blender 5.3 + RTX) e traz para public/models/.
# Uso: art/gerar_modelos.sh [balcao|salao|mascaras|todos] [ids de pessoas...]
#   art/gerar_modelos.sh mascaras executivo turista   # só essas pessoas
set -euo pipefail
cd "$(dirname "$0")/.."
ALVO="${1:-todos}"
shift || true
BLENDER="& 'C:\\Program Files\\Blender Foundation\\Blender 5.3\\blender.exe'"

COPYFILE_DISABLE=1 tar czf - art/blender | ssh simaonote "New-Item -ItemType Directory -Force C:/barman | Out-Null; tar xzf - -C C:/barman"

rodar() {
  echo "▶ $1 $*"
  ssh simaonote "Set-Location C:/barman; $BLENDER -b -P C:/barman/art/blender/$1 -- C:/barman/out ${*:2} 2>&1 | Select-String -Pattern 'CONSTRUINDO|EXPORTADO|PRONTO|Error:|Traceback'"
}

case "$ALVO" in
  balcao)   rodar build_balcao.py ;;
  salao)    rodar build_salao.py ;;
  mascaras) rodar build_mascaras.py "$@" ;;
  todos)    rodar build_balcao.py; rodar build_salao.py; rodar build_mascaras.py ;;
  *) echo "alvo desconhecido: $ALVO"; exit 1 ;;
esac

mkdir -p public/models/{cenario,props,pessoas}
for f in sala estante balcao mesa cadeira cabine banqueta piano porta janela relogio luminaria; do
  scp -q "simaonote:C:/barman/out/$f.glb" public/models/cenario/ 2>/dev/null || true
done
for f in copos garrafas; do scp -q "simaonote:C:/barman/out/$f.glb" public/models/props/ 2>/dev/null || true; done
scp -q "simaonote:C:/barman/out/mascara_*.glb" public/models/pessoas/ 2>/dev/null || true
chmod 644 public/models/*/*.glb
echo "✔ modelos em public/models/"
