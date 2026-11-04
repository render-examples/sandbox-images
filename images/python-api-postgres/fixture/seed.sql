CREATE TABLE orders (id integer PRIMARY KEY, customer text NOT NULL, total_cents integer NOT NULL CHECK(total_cents >= 0));
INSERT INTO orders VALUES (1,'Acme',2500),(2,'Orbit',750),(3,'Penny',101);
