BEGIN;
ALTER TABLE orders ADD COLUMN total_cents bigint;
ALTER TABLE orders ADD COLUMN currency text NOT NULL DEFAULT 'EUR';
UPDATE orders SET total_cents = (total * 100)::bigint;
ALTER TABLE orders ALTER COLUMN total_cents SET NOT NULL;
ALTER TABLE orders ADD CONSTRAINT orders_total_cents_check CHECK (total_cents >= 0);
ALTER TABLE orders ADD CONSTRAINT orders_currency_check CHECK (currency IN ('EUR', 'USD'));
ALTER TABLE orders DROP COLUMN total;
COMMIT;
