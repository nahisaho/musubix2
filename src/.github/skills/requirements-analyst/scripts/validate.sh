#!/bin/bash
# Validate requirements EARS compliance
set -e
FILE="${1:?Usage: validate.sh <requirements-file.md>}"
npx musubix req "$FILE"
