#!/bin/bash
# Records a demo of Maccy (open-source clipboard manager, MIT) on a throwaway GitHub Actions macOS machine.
# Installs the official build with Homebrew, copies a few things, opens Maccy's history and searches it.
set -euo pipefail
mkdir -p out

brew install --cask maccy && xattr -dr com.apple.quarantine /Applications/Maccy.app || true >/dev/null
brew install ffmpeg >/dev/null

# Throwaway machine: grant screen recording and accessibility so the script can record and press keys.
# Works on GitHub's macOS images, where System Integrity Protection is off. Never do this on a real Mac.
grant() { # service, client path
  sudo sqlite3 "/Library/Application Support/com.apple.TCC/TCC.db" \
    "INSERT OR REPLACE INTO access (service,client,client_type,auth_value,auth_reason,auth_version,flags) VALUES ('$1','$2',1,2,4,1,0);" 2>&1 || true
}
for c in /bin/bash /usr/bin/osascript "$(brew --prefix)/bin/ffmpeg" /usr/sbin/screencapture /Applications/Maccy.app; do
  grant kTCCServiceScreenCapture "$c"; grant kTCCServiceAccessibility "$c"
done
grant kTCCServiceAccessibility org.p0deje.Maccy || true

open -a Maccy; sleep 4
osascript -e 'tell application "System Events" to key code 53' || true   # dismiss any first-run window

# Things a person might copy during a day (all made up)
for t in "Meeting at 4pm with Riya - Zoom link in invite" "HDFC0001234" "https://smallbiggrowth.com" "Order #4417 shipped" "UPI ID: example@okhdfc" "Invoice INV-2026-118 paid"; do
  printf '%s' "$t" | pbcopy; sleep 0.6
done

screen=$(ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep -m1 -oE '\[[0-9]+\] Capture screen' | grep -oE '[0-9]+' || echo 1)
ffmpeg -y -loglevel error -f avfoundation -framerate 30 -capture_cursor 1 -i "${screen}:none" -t 18 -c:v libx264 -preset veryfast -pix_fmt yuv420p out/demo.mp4 &
FF=$!
sleep 2
# Open Maccy (default shortcut Shift+Cmd+C), then type to search the history
osascript -e 'tell application "System Events" to keystroke "c" using {shift down, command down}'; sleep 2.5
osascript -e 'tell application "System Events" to key code 125'; sleep 0.6
osascript -e 'tell application "System Events" to key code 125'; sleep 0.8
for ch in u p i; do osascript -e "tell application \"System Events\" to keystroke \"$ch\""; sleep 0.35; done
sleep 2.5
osascript -e 'tell application "System Events" to key code 53'; sleep 1
osascript -e 'tell application "System Events" to keystroke "c" using {shift down, command down}'; sleep 1.5
for ch in i n v; do osascript -e "tell application \"System Events\" to keystroke \"$ch\""; sleep 0.35; done
sleep 3
wait $FF || true
ls -la out
