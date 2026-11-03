CREATE EXTENSION vector;
CREATE TABLE documents (
  id integer PRIMARY KEY,
  title text NOT NULL,
  embedding vector(3) NOT NULL
);
INSERT INTO documents VALUES
  (1, 'Payment API', '[1,0,0]'),
  (2, 'Billing guide', '[0.9,0.1,0]'),
  (3, 'Shipping guide', '[0,1,0]'),
  (4, 'Invoice example', '[0.5,0.5,0]');
CREATE INDEX documents_embedding_idx ON documents USING hnsw (embedding vector_l2_ops);
CREATE TABLE orders (id integer PRIMARY KEY, document_id integer REFERENCES documents, total_cents integer NOT NULL CHECK(total_cents >= 0));
INSERT INTO orders VALUES (1,1,2000), (2,2,1500), (3,4,1000);
