export class BookRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async initialize() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        isbn VARCHAR(13) NOT NULL UNIQUE,
        stock INTEGER NOT NULL CHECK (stock >= 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  async seed() {
    await this.pool.query(
      `INSERT INTO books (title, author, isbn, stock)
       VALUES
         ('Clean Code', 'Robert C. Martin', '9780132350884', 3),
         ('The DevOps Handbook', 'Gene Kim', '9781950508402', 2),
         ('Designing Data-Intensive Applications', 'Martin Kleppmann', '9781449373320', 2)
       ON CONFLICT (isbn) DO NOTHING`,
    );
  }

  async findAll() {
    const { rows } = await this.pool.query(
      "SELECT id::int AS id, title, author, isbn, stock, created_at FROM books ORDER BY id",
    );
    return rows;
  }

  async findById(id) {
    const { rows } = await this.pool.query(
      "SELECT id::int AS id, title, author, isbn, stock, created_at FROM books WHERE id = $1",
      [id],
    );
    return rows[0] ?? null;
  }

  async create({ title, author, isbn, stock }) {
    const { rows } = await this.pool.query(
      `INSERT INTO books (title, author, isbn, stock)
       VALUES ($1, $2, $3, $4)
       RETURNING id::int AS id, title, author, isbn, stock, created_at`,
      [title, author, isbn, stock],
    );
    return rows[0];
  }

  async adjustStock(id, delta) {
    const { rows } = await this.pool.query(
      `UPDATE books
       SET stock = stock + $2
       WHERE id = $1 AND stock + $2 >= 0
       RETURNING id::int AS id, title, author, isbn, stock, created_at`,
      [id, delta],
    );
    return rows[0] ?? null;
  }
}
