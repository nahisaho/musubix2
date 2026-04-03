#!/bin/bash
# Generate tests
set -e
npx musubix test:gen "$@"
