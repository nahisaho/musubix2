#!/bin/bash
# Security scan
set -e
npx musubix security "$@"
