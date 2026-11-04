CREATE TABLE customers (id integer PRIMARY KEY, name text NOT NULL);
CREATE TABLE orders (
  id integer PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES customers(id),
  total numeric(10,2) NOT NULL CHECK (total >= 0),
  status text NOT NULL CHECK (status IN ('paid', 'pending'))
);
INSERT INTO customers VALUES (1, 'Example A'), (2, 'Example B');
INSERT INTO orders VALUES
  (1, 1, 20.00, 'paid'),
  (2, 1, 15.00, 'paid'),
  (3, 2, 10.00, 'pending'),
  (4, 2, 82.50, 'paid');
