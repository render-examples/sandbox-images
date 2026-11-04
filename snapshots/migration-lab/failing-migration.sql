BEGIN;
ALTER TABLE orders ADD COLUMN failed_marker text;
UPDATE orders SET total_cents = total_cents + 100;
-- The preceding DDL and data edits must disappear when this fails.
UPDATE orders SET total_cents = -1 WHERE id = 1;
COMMIT;
