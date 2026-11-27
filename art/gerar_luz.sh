#!/usr/bin/env bash
# Assa a luz do bar no Windows (simaonote, Blender 5.3 + RTX 4070) e traz para public/models/luz/.
# Precisa do servidor de desenvolvimento em http://localhost:5180 (npx vite --port 5180).
# Uso: art/gerar_luz.sh [tamanho=4096] [amostras=512]
set -euo pipefail
cd "$(dirname "$0")/.."
SIZE="${1:-4096}"
SAMPLES="${2:-512}"
BLENDER="& 'C:\\Program Files\\Blender Foundation\\Blender 5.3\\blender.exe'"

node scripts/export-bake.js art/luz
COPYFILE_DISABLE=1 tar czf - art/blender/bake_luz.py art/luz | ssh simaonote "New-Item -ItemType Directory -Force C:/barman | Out-Null; tar xzf - -C C:/barman"
ssh simaonote "Set-Location C:/barman; $BLENDER -b -P C:/barman/art/blender/bake_luz.py -- C:/barman/art/luz C:/barman/out/luz $SIZE $SAMPLES 2>&1 | Select-String -Pattern 'LUZ|Error|Traceback|rror'" || true
mkdir -p public/models/luz
for f in bar_luz.glb bar_luz.jpg bar_luz.json; do scp -q "simaonote:C:/barman/out/luz/$f" public/models/luz/; done
chmod 644 public/models/luz/*
echo "✔ luz assada em public/models/luz/"
