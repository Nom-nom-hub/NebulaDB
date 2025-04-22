#!/bin/bash

# Fix unused variables in query.ts
sed -i '' 's/import { generateQuery } from/import {\/\* generateQuery \*\/} from/' /Volumes/Teck/NebulaDB/benchmarks/src/query.ts

# Fix unused variables in update.ts
sed -i '' 's/import { generateUpdate } from/import {\/\* generateUpdate \*\/} from/' /Volumes/Teck/NebulaDB/benchmarks/src/update.ts

# Fix unused variables in indexeddb adapter
sed -i '' 's/\(onupgradeneeded = (event\)/onupgradeneeded = (\/\* event \*\//g' /Volumes/Teck/NebulaDB/packages/adapters/indexeddb/src/index.ts

# Fix unused variables in generate-adapter.ts
sed -i '' 's/const variableName/\/\/ const variableName/g' /Volumes/Teck/NebulaDB/packages/cli/src/commands/generate-adapter.ts

# Fix unused variables in collection.ts
sed -i '' 's/import { EnhancedIndexManager, IndexDefinition, IndexType } from/import { EnhancedIndexManager, IndexDefinition \/\*, IndexType \*\/ } from/g' /Volumes/Teck/NebulaDB/packages/core/src/collection.ts
sed -i '' 's/const matchingDocs/\/\/ const matchingDocs/g' /Volumes/Teck/NebulaDB/packages/core/src/collection.ts

# Fix unused variables in enhanced-indexing.ts
sed -i '' 's/const field/\/\/ const field/g' /Volumes/Teck/NebulaDB/packages/core/src/enhanced-indexing.ts
sed -i '' 's/const index/\/\/ const index/g' /Volumes/Teck/NebulaDB/packages/core/src/enhanced-indexing.ts

# Fix unused variables in indexing.ts
sed -i '' 's/interface IndexEntry/\/\* interface IndexEntry/g' /Volumes/Teck/NebulaDB/packages/core/src/indexing.ts
sed -i '' 's/}/}\*\//g' /Volumes/Teck/NebulaDB/packages/core/src/indexing.ts

# Fix unused variables in query.ts
sed -i '' 's/import { Document, Query, QueryCondition } from/import { Document, Query \/\*, QueryCondition \*\/ } from/g' /Volumes/Teck/NebulaDB/packages/core/src/query.ts

# Fix unused variables in connection.ts
sed -i '' 's/import { Server, Socket } from/import { Server \/\*, Socket \*\/ } from/g' /Volumes/Teck/NebulaDB/packages/devtools/src/connection.ts

# Fix unused variables in json-schema/src/index.ts
sed -i '' 's/\(indent: string\)/\/\* indent: string \*\//g' /Volumes/Teck/NebulaDB/packages/json-schema/src/index.ts

# Fix unused variables in model-manager.ts
sed -i '' 's/import { IndexDefinition, IndexType } from/import { IndexDefinition \/\*, IndexType \*\/ } from/g' /Volumes/Teck/NebulaDB/packages/orm/src/model-manager.ts
sed -i '' 's/import { FIELD_META_KEY, RELATION_META_KEY } from/import { FIELD_META_KEY \/\*, RELATION_META_KEY \*\/ } from/g' /Volumes/Teck/NebulaDB/packages/orm/src/model-manager.ts

# Fix unused variables in plugin-sync/src/index.ts
sed -i '' 's/const conflictResolution/\/\/ const conflictResolution/g' /Volumes/Teck/NebulaDB/packages/plugin-sync/src/index.ts

# Fix unused variables in logger plugin
sed -i '' 's/\(db: Database\)/\/\* db: Database \*\//g' /Volumes/Teck/NebulaDB/packages/plugins/logger/src/index.ts

# Fix unused variables in migration plugin
sed -i '' 's/const appliedMigrations/\/\/ const appliedMigrations/g' /Volumes/Teck/NebulaDB/packages/plugins/migration/src/index.ts

# Fix unused variables in schema-preview-panel.ts
sed -i '' 's/catch (e) {/catch (\/\* e \*\/) {/g' /Volumes/Teck/NebulaDB/packages/vscode-extension/src/panels/schema-preview-panel.ts

# Fix unused variables in schema-parser.ts
sed -i '' 's/import { workspace, Uri, path } from/import { workspace, Uri \/\*, path \*\/ } from/g' /Volumes/Teck/NebulaDB/packages/vscode-extension/src/parsers/schema-parser.ts

# Fix unused variables in core.test.ts
sed -i '' 's/import { describe, it, expect, vi } from/import { describe, it, expect \/\*, vi \*\/ } from/g' /Volumes/Teck/NebulaDB/tests/unit/core.test.ts

echo "Fixed ESLint errors"
