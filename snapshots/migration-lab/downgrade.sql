BEGIN;
ALTER TABLE orders ADD COLUMN total numeric(10,2);
UPDATE orders SET total = total_cents / 100.0;
ALTER TABLE orders ALTER COLUMN total SET NOT NULL;
ALTER TABLE orders ADD CONSTRAINT orders_total_check CHECK (total >= 0);
ALTER TABLE orders DROP COLUMN total_cents;
ALTER TABLE orders DROP COLUMN currency;
COMMIT;
