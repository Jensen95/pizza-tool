#!/usr/bin/env bash
set -euo pipefail

# Post-room hook: run Prettier so formatting stays consistent for both agents
npm run format
