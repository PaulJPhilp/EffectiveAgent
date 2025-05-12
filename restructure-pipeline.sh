#!/bin/bash

set -e

cd /Users/paul/Projects/EffectiveAgent/src/services/pipeline

# INPUT DOMAIN
mkdir -p input/__tests__
mv input/api.ts input/input.api.ts
mv input/errors.ts input/input.errors.ts
mv input/helpers.ts input/input.helpers.ts
mv input/schema.ts input/input.schema.ts
mv input/service.ts input/input.service.ts
# input/__tests__/service.test.ts already in place

# CHAT DOMAIN
mkdir -p chat/__tests__
mv chat/api.ts chat/chat.api.ts
mv chat/service.ts chat/chat.service.ts
mv chat/service.test.ts chat/__tests__/service.test.ts

# BRIDGE DOMAIN
mv bridge/api.ts bridge/bridge.api.ts
mv bridge/service.ts bridge/bridge.service.ts
mv bridge/types.ts bridge/bridge.types.ts

# EXECUTIVE DOMAIN (remove if empty)
rmdir executive 2>/dev/null || true

# SHARED UTILITIES
mkdir -p shared
# Move global types, utils, errors if they exist
[ -f types/index.ts ] && mv types/index.ts shared/types.ts
[ -f utils/index.ts ] && mv utils/index.ts shared/utils.ts
[ -f errors.ts ] && mv errors.ts shared/errors.ts

# TOP-LEVEL FILES
# Move or remove ambiguous top-level files if not domain-specific
[ -f api.ts ] && mv api.ts shared/api.ts
[ -f errors.ts ] && mv errors.ts shared/errors.ts
[ -f schema.ts ] && mv schema.ts shared/schema.ts
[ -f service.ts ] && mv service.ts shared/service.ts

# Create index.ts for each domain if missing
for domain in input chat bridge producers shared; do
  [ ! -f $domain/index.ts ] && touch $domain/index.ts
done

echo "Pipeline folder reorganization complete."
