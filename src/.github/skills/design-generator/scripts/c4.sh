#!/bin/bash
# Generate C4 diagram
set -e
npx musubix design:c4 "$@"
