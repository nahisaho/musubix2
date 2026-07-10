#!/bin/bash
# Start 1問1答 requirements interview
set -e
INPUT="${1:-}"
if [ -n "$INPUT" ]; then
  npx musubix req:interview "$INPUT"
else
  npx musubix req:interview
fi
