#!/bin/bash
# apply-update.sh — copy a new Surya Remind build into your existing repo
# WITHOUT touching your already-filled-in credentials.
#
# Every zip from Claude ships placeholder values for these 3 files (Claude
# never has your real Firebase keys), so a plain copy-paste would wipe them:
#   - public/firebase-config.js
#   - public/firebase-messaging-sw.js
#   - .firebaserc
# This script copies everything EXCEPT those three.
#
# Usage:
#   ./apply-update.sh /path/to/unzipped-new-build /path/to/your/SuryaReminder-repo

set -e
SRC="$1"
DEST="$2"

if [ -z "$SRC" ] || [ -z "$DEST" ]; then
  echo "Usage: $0 <unzipped-new-build-folder> <your-repo-folder>"
  exit 1
fi

rsync -av \
  --exclude 'public/firebase-config.js' \
  --exclude 'public/firebase-messaging-sw.js' \
  --exclude '.firebaserc' \
  "$SRC"/ "$DEST"/

echo ""
echo "Done. Your credentials were left untouched. Now run:"
echo "  cd $DEST"
echo "  git add -A && git commit -m 'Update app' && git push"
echo "  firebase deploy --only hosting,firestore"
