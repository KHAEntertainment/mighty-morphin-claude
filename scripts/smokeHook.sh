#!/usr/bin/env bash
set -euo pipefail

TMP="scripts/fixtures"
mkdir -p "$TMP"

TARGET="scripts/fixtures/example.ts"
echo 'export const msg = "hello";' > "$TARGET"

cat > "$TMP/postToolUse.json" <<'JSON'
{
  "session_id": "abc123",
  "transcript_path": "/tmp/fake.jsonl",
  "cwd": ".",
  "hook_event_name": "PostToolUse",
  "tool_name": "Write",
  "tool_input": {
    "file_path": "scripts/fixtures/example.ts",
    "content": "export const msg = \"hello world (updated)\";"
  },
  "tool_response": {
    "filePath": "scripts/fixtures/example.ts",
    "success": true
  }
}
JSON

[ -f "dist/hooks/morphApply.js" ] || npm run build

node dist/hooks/morphApply.js < "$TMP/postToolUse.json"

echo
echo "Result:"
cat "$TARGET"
echo

echo "Done."
