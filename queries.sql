CREATE DATABASE IF NOT EXISTS centralInventory;
USE centralInventory;
CREATE DATABASE IF NOT EXISTS inventory1;
USE Inventory1;
CREATE DATABASE IF NOT EXISTS inventory2;
USE Inventory2;
CREATE DATABASE IF NOT EXISTS inventory3;
USE Inventory3;

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  category VARCHAR(255),
  price DECIMAL(10, 2),
  description TEXT
);

CREATE TABLE stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT,
  store_id INT,
  quantity_changed INT,
  reason VARCHAR(255),
  movement_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE

);

CREATE TABLE stocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT,
  store_id INT,
  stock INT DEFAULT 0,
  UNIQUE (product_id, store_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);


CREATE TABLE stores (
  id INT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT
);

CREATE INDEX idx_stock_movements_time ON stock_movements(movement_time);

-- Central DB schemas

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    password TEXT,
    store_id INTEGER, -- NULL for superadmin
    role VARCHAR(12) CHECK(role IN ('superadmin', 'storeadmin')) NOT NULL,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);


CREATE TABLE tracker (
	entity INT NOT NULL,
    next_id INT NOT NULL
);

insert into tracker values (0,0) , (1,0);

select * from users;
update users set username = 'superadmin';
--insert into users (username,password,role,store_id) VALUES ('superadmin','$2b$10$j2brGcFFfmQkiHUhivmI6eORf3kLqXnsDhPes5r3K2nVY.7lujGza','superadmin',NULL);
select * from products where id = 5;
select * from stock_movements LIMIT 2 OFFSET 4;
select * from products p join stocks s on s.product_id = p.id join stores s1 on s1.id = s.store_id where p.id = 5;
select COUNT(*) from products p join stocks s on s.product_id = p.id join stores s1 on s1.id = s.store_id;
DROP TABLE users;
DROP TABLE stores;
DROP TABLE stocks;
DROP TABLE stock_movements;
DROP TABLE Products;
