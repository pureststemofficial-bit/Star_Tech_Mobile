/* Columns added after the first release. Each is added once if the database doesn't have it yet. */
export const ADDED_COLUMNS: [table: string, column: string, definition: string][] = [
  ...['name_pt', 'short_desc_pt', 'description_pt', 'features_pt', 'specs_pt'].map((c) => ['products', c, "TEXT NOT NULL DEFAULT ''"] as [string, string, string]),
  ...['name_pt', 'nav_label_pt'].map((c) => ['categories', c, "TEXT NOT NULL DEFAULT ''"] as [string, string, string]),
  ...['title_pt', 'subtitle_pt', 'body_pt'].map((c) => ['pages', c, "TEXT NOT NULL DEFAULT ''"] as [string, string, string]),
  ['orders', 'stripe_session_id', "TEXT NOT NULL DEFAULT ''"],
];

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone         TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS addresses (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name  TEXT NOT NULL,
  line1      TEXT NOT NULL,
  line2      TEXT NOT NULL DEFAULT '',
  city       TEXT NOT NULL,
  postcode   TEXT NOT NULL,
  phone      TEXT NOT NULL DEFAULT '',
  is_default INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);

CREATE TABLE IF NOT EXISTS categories (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  image        TEXT NOT NULL DEFAULT '',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  show_in_nav  INTEGER NOT NULL DEFAULT 0,
  show_on_home INTEGER NOT NULL DEFAULT 1,
  nav_label    TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS products (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  brand         TEXT NOT NULL DEFAULT '',
  price_pence   INTEGER NOT NULL CHECK (price_pence >= 0),
  compare_pence INTEGER NOT NULL DEFAULT 0,
  stock         INTEGER NOT NULL DEFAULT 0,
  short_desc    TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  features      TEXT NOT NULL DEFAULT '',
  specs         TEXT NOT NULL DEFAULT '',
  colours       TEXT NOT NULL DEFAULT '',
  options       TEXT NOT NULL DEFAULT '',
  is_featured   INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  sold_count    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_cat ON products(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price_pence);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured, is_active);

CREATE TABLE IF NOT EXISTS product_images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  path       TEXT NOT NULL,
  thumb      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id, sort_order);

CREATE TABLE IF NOT EXISTS reviews (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  author      TEXT NOT NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body        TEXT NOT NULL,
  is_approved INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id, is_approved);

CREATE TABLE IF NOT EXISTS wishlist (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number    TEXT NOT NULL UNIQUE,
  user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  email           TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  phone           TEXT NOT NULL DEFAULT '',
  line1           TEXT NOT NULL,
  line2           TEXT NOT NULL DEFAULT '',
  city            TEXT NOT NULL,
  postcode        TEXT NOT NULL,
  notes           TEXT NOT NULL DEFAULT '',
  subtotal_pence  INTEGER NOT NULL,
  delivery_pence  INTEGER NOT NULL,
  total_pence     INTEGER NOT NULL,
  payment_method  TEXT NOT NULL DEFAULT '',
  payment_status  TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','refunded')),
  status          TEXT NOT NULL DEFAULT 'processing'
                  CHECK (status IN ('processing','shipped','out_for_delivery','delivered','cancelled')),
  tracking_number TEXT NOT NULL DEFAULT '',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS order_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INTEGER REFERENCES products(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  variant     TEXT NOT NULL DEFAULT '',
  image       TEXT NOT NULL DEFAULT '',
  price_pence INTEGER NOT NULL,
  qty         INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS repairs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  ref            TEXT NOT NULL UNIQUE,
  user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  device_type    TEXT NOT NULL,
  brand          TEXT NOT NULL,
  model          TEXT NOT NULL,
  repair_type    TEXT NOT NULL,
  full_name      TEXT NOT NULL,
  phone          TEXT NOT NULL,
  email          TEXT NOT NULL,
  preferred_date TEXT NOT NULL,
  preferred_time TEXT NOT NULL,
  details        TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new','confirmed','in_progress','completed','cancelled')),
  admin_notes    TEXT NOT NULL DEFAULT '',
  quote_pence    INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_repairs_status ON repairs(status);

CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT NOT NULL DEFAULT '',
  body       TEXT NOT NULL,
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pages (
  slug       TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  subtitle   TEXT NOT NULL DEFAULT '',
  body       TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT NOT NULL UNIQUE,
  published    TEXT NOT NULL,
  image        TEXT NOT NULL,
  thumb        TEXT NOT NULL,
  category     TEXT NOT NULL,
  category_pt  TEXT NOT NULL DEFAULT '',
  title        TEXT NOT NULL,
  title_pt     TEXT NOT NULL DEFAULT '',
  excerpt      TEXT NOT NULL,
  excerpt_pt   TEXT NOT NULL DEFAULT '',
  body         TEXT NOT NULL,
  body_pt      TEXT NOT NULL DEFAULT '',
  cta_href     TEXT NOT NULL DEFAULT '',
  cta_label    TEXT NOT NULL DEFAULT '',
  cta_label_pt TEXT NOT NULL DEFAULT '',
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_blog_listing ON blog_posts(is_active, published);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Session IDs are stored only as SHA-256 hashes, so a leaked database can't be used to hijack logins.
CREATE TABLE IF NOT EXISTS sessions (
  id_hash TEXT PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  data    TEXT NOT NULL DEFAULT '{}',
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`;
