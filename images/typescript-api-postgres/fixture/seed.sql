CREATE TABLE orders(id integer PRIMARY KEY, total_cents integer NOT NULL CHECK(total_cents >= 0));
INSERT INTO orders(id,total_cents) VALUES(1,2500),(2,750),(3,1750);
