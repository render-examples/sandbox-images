ALTER TABLE orders ADD COLUMN priority text NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal','urgent'));
UPDATE orders SET priority='urgent' WHERE id=1;
