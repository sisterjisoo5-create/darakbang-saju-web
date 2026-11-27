#!/usr/bin/env bash
# 3층 다락방 AI 오피스 — 암호화 스크립트 실행 래퍼 (node 경로를 스스로 찾는다)
#   OFFICE_PASSWORD=<비밀번호> scripts/office-encrypt.sh          # public/office/data.json → data.enc.json(2곳)
#   OFFICE_PASSWORD=<비밀번호> scripts/office-encrypt.sh --verify # 복호화 검증
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
for c in node nodejs \
         /workspace/.tools/node-v20.18.0-linux-x64/bin/node \
         "$HOME/.tools/node-v20.18.0-linux-x64/bin/node" \
         /usr/local/bin/node /usr/bin/node; do
  if [ -x "$c" ] || command -v "$c" >/dev/null 2>&1; then
    exec "$c" "$HERE/office-encrypt.mjs" "$@"
  fi
done
echo "✖ node 를 찾지 못했습니다. PATH 에 node 를 추가한 뒤 다시 실행해 주세요." >&2
exit 1
