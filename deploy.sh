#!/bin/bash
# ─── ADPTV Command Center Deploy Script ───
# Creates a zip backup, tags the version, commits, and pushes.
#
# Usage:
#   ./deploy.sh              → auto-increments version (v95 → v96)
#   ./deploy.sh v97          → sets specific version
#   ./deploy.sh v97 "message" → sets version + custom commit message

set -e
cd "$(dirname "$0")"

# ─── Get current version from Dashboard.jsx ───
CURRENT=$(grep -o 'APP_VERSION = "v[0-9]*[a-z]*"' components/Dashboard.jsx | grep -o 'v[0-9]*[a-z]*')
echo "Current version: $CURRENT"

# ─── Determine new version ───
if [ -n "$1" ]; then
  NEW_VERSION="$1"
else
  # Auto-increment: extract number, add 1
  NUM=$(echo "$CURRENT" | grep -o '[0-9]*')
  NEXT=$((NUM + 1))
  NEW_VERSION="v${NEXT}"
fi
echo "New version: $NEW_VERSION"

# ─── Create zip backup of current version BEFORE changes ───
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ZIP_NAME="command-app-${CURRENT}_${TIMESTAMP}.zip"
echo "Creating backup: $BACKUP_DIR/$ZIP_NAME"
zip -r "$BACKUP_DIR/$ZIP_NAME" . \
  -x "./backups/*" \
  -x "./.git/*" \
  -x "./node_modules/*" \
  -x "./.next/*" \
  -x "./.env*" \
  > /dev/null 2>&1
echo "✓ Backup saved"

# ─── Bump version in Dashboard.jsx ───
sed -i '' "s/APP_VERSION = \"$CURRENT\"/APP_VERSION = \"$NEW_VERSION\"/" components/Dashboard.jsx
echo "✓ Version bumped: $CURRENT → $NEW_VERSION"

# ─── Commit message ───
if [ -n "$2" ]; then
  MSG="$2 ($NEW_VERSION)"
else
  MSG="Deploy $NEW_VERSION"
fi

# ─── Git add, commit, tag, push ───
git add -A
git commit -m "$MSG

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

git tag -a "$NEW_VERSION" -m "Release $NEW_VERSION"
echo "✓ Tagged: $NEW_VERSION"

git push && git push --tags
echo ""
echo "═══════════════════════════════════════"
echo "  ✓ Deployed $NEW_VERSION"
echo "  ✓ Backup: $BACKUP_DIR/$ZIP_NAME"
echo "  ✓ Tag: $NEW_VERSION"
echo "═══════════════════════════════════════"
