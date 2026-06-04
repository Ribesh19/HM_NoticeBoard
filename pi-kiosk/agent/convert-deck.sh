#!/usr/bin/env bash
#
# Convert a single PowerPoint deck into per-slide PNGs and publish them to the
# kiosk web root via an atomic manifest swap. The running kiosk keeps showing
# the previous deck until the new manifest is in place, so there is never a
# blank/black frame.
#
# Usage: convert-deck.sh <deck.pptx> <webroot> [durationMs]
set -euo pipefail

SRC="${1:?usage: convert-deck.sh <deck.pptx> <webroot> [durationMs]}"
WEBROOT="${2:?usage: convert-deck.sh <deck.pptx> <webroot> [durationMs]}"
DURATION_MS="${3:-12000}"

CURRENT_DIR="$WEBROOT/current"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

if [[ ! -f "$SRC" ]]; then
  echo "convert-deck: source not found: $SRC" >&2
  exit 1
fi

mkdir -p "$CURRENT_DIR"

# Version tag derived from the file's mtime + size. Changes whenever the deck
# is re-saved; also becomes the per-build folder name (cache-busts the browser).
VERSION="$(stat -c '%Y-%s' "$SRC")"
BUILD="build-$VERSION"
BUILD_DIR="$CURRENT_DIR/$BUILD"

# 1) PowerPoint -> PDF (LibreOffice headless). A private profile dir avoids
#    clashing with any interactive LibreOffice and keeps it non-interactive.
soffice \
  --headless --norestore --nologo --nofirststartwizard \
  -env:UserInstallation="file://$WORK_DIR/lo-profile" \
  --convert-to pdf --outdir "$WORK_DIR" "$SRC" >/dev/null

PDF="$WORK_DIR/$(basename "${SRC%.*}").pdf"
if [[ ! -f "$PDF" ]]; then
  echo "convert-deck: PDF conversion failed for $SRC" >&2
  exit 1
fi

# 2) PDF -> one PNG per page, scaled to 1920px wide (aspect preserved).
#    pdftoppm zero-pads the page numbers to a fixed width, so plain sort works.
pdftoppm -png -scale-to-x 1920 -scale-to-y -1 "$PDF" "$WORK_DIR/slide" >/dev/null

shopt -s nullglob
PNGS=("$WORK_DIR"/slide-*.png)
if [[ ${#PNGS[@]} -eq 0 ]]; then
  echo "convert-deck: no slides rendered from $SRC" >&2
  exit 1
fi

# 3) Stage the build folder, then build the slide list for the manifest.
mkdir -p "$BUILD_DIR"
cp "${PNGS[@]}" "$BUILD_DIR/"

slides_json=""
for png in $(cd "$BUILD_DIR" && ls slide-*.png | sort); do
  entry="\"$BUILD/$png\""
  slides_json="${slides_json:+$slides_json,}$entry"
done

# 4) Write the manifest to a temp file, then mv into place. mv on the same
#    filesystem is atomic, so the kiosk never reads a half-written manifest.
cat > "$CURRENT_DIR/manifest.json.tmp" <<EOF
{"version":"$VERSION","durationMs":$DURATION_MS,"slides":[$slides_json]}
EOF
mv -f "$CURRENT_DIR/manifest.json.tmp" "$CURRENT_DIR/manifest.json"

# 5) Drop any older build folders now that the new one is live.
find "$CURRENT_DIR" -maxdepth 1 -type d -name 'build-*' ! -name "$BUILD" -exec rm -rf {} +

echo "convert-deck: published $BUILD (${#PNGS[@]} slides)"
