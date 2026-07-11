#!/bin/bash
# Verify design traceability
set -e
npx musubix design:verify "$@"
