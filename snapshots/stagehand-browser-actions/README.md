# Stagehand browser actions

Uses the `stagehand` image. This is a draft recipe; publication and live Render capture/restore evidence are pending.

Upload only `recipe.sh` and `recipe.json` to `/workspace/stagehand-browser-actions`. Run `bash recipe.sh prepare`, capture a filesystem snapshot in your sandbox group, then restore into a fresh sandbox. Run `bash recipe.sh analyze`, `bash recipe.sh verify`, and `bash recipe.sh test`. These commands reject input/output corruption and regenerate outputs; they do not claim a live authenticated model run.

Generated outputs must be absent before capture. Browser and database processes restart after a filesystem restore. The recipe records baseline input hashes and verifies decoded artifacts independently. Never store provider credentials in prepared inputs or snapshots.
