#!/usr/bin/env bash
set -euo pipefail
LAB_DIR=/workspace/image-smoke/database
source /opt/render/examples/postgres-lab/common.sh
init_db
trap cleanup_db EXIT
start_db
result=$(sql <<'SQL'
CREATE EXTENSION vector;
CREATE TABLE smoke_vectors(id integer PRIMARY KEY, embedding vector(3));
INSERT INTO smoke_vectors VALUES (1, '[1,0,0]'), (2, '[0,1,0]');
SELECT id FROM smoke_vectors ORDER BY embedding <-> '[1,0,0]' LIMIT 1;
SQL
)
[[ "$result" == 1 ]]
[[ $(sql -c "SELECT extversion FROM pg_extension WHERE extname='vector'") == 0.8.7 ]]
[[ $(sql -c 'SHOW listen_addresses') == '' ]]
version=$(sql -c 'SHOW server_version_num')
[[ "$version" == 18* ]]
stop_db
printf '{"status":"passed","nearestId":1,"pgvector":"0.8.7","postgresVersionNumber":%s}\n' "$version" > /workspace/image-smoke/result.json
cat /workspace/image-smoke/result.json
