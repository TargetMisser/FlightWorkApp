#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v java >/dev/null 2>&1; then
  echo "[check-env] java non trovato nel PATH"
  exit 1
fi

JAVA_VER_RAW="$(java -version 2>&1 | head -n 1)"
JAVA_MAJOR="$(echo "$JAVA_VER_RAW" | sed -E 's/.*version "([0-9]+).*/\1/')"

if [[ "$JAVA_MAJOR" != "17" && "$JAVA_MAJOR" != "21" ]]; then
  echo "[check-env] Java non supportata: $JAVA_VER_RAW"
  echo "[check-env] Usa JDK 17 o 21 per build Android release"
  exit 1
fi

if [[ ! -x "$ROOT_DIR/android/gradlew" ]]; then
  echo "[check-env] gradlew non trovato o non eseguibile in android/"
  exit 1
fi

echo "[check-env] OK - Java $JAVA_MAJOR compatibile"
