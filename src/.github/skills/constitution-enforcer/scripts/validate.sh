#!/bin/bash
# Validate policy compliance
set -e
npx musubix policy "$@"
