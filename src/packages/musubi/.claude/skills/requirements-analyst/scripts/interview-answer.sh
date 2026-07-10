#!/bin/bash
# Answer an interview question
set -e
npx musubix req:interview --answer "$1" "$2"
