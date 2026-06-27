export class LoanRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async initialize() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS loans (
        id UUID PRIMARY KEY,
        book_id INTEGER NOT NULL,
        borrower_name TEXT NOT NULL,
        status VARCHAR(10) NOT NULL CHECK (status IN ('active', 'returned')),
        loaned_at TIMESTAMPTZ NOT NULL,
        returned_at TIMESTAMPTZ
      )
    `);
  }

  async findAll() {
    const { rows } = await this.pool.query(
      `SELECT id, book_id::int AS book_id, borrower_name, status, loaned_at, returned_at
       FROM loans ORDER BY loaned_at DESC`,
    );
    return rows;
  }

  async findById(id) {
    const { rows } = await this.pool.query(
      `SELECT id, book_id::int AS book_id, borrower_name, status, loaned_at, returned_at
       FROM loans WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async create(loan) {
    const { rows } = await this.pool.query(
      `INSERT INTO loans (id, book_id, borrower_name, status, loaned_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, book_id::int AS book_id, borrower_name, status, loaned_at, returned_at`,
      [loan.id, loan.bookId, loan.borrowerName, loan.status, loan.loanedAt],
    );
    return rows[0];
  }

  async markReturned(id, returnedAt) {
    const { rows } = await this.pool.query(
      `UPDATE loans SET status = 'returned', returned_at = $2
       WHERE id = $1 AND status = 'active'
       RETURNING id, book_id::int AS book_id, borrower_name, status, loaned_at, returned_at`,
      [id, returnedAt],
    );
    return rows[0] ?? null;
  }
}
