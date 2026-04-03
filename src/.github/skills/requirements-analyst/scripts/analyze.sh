#!/bin/bash
# Analyze requirements from a markdown file
set -e
FILE="${1:?Usage: analyze.sh <requirements-file.md>}"
npx musubix req "$FILE"
