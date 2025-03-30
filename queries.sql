CREATE DATABASE IF NOT EXISTS inventorySystem;
USE inventorySystem;

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
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT
);

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    password TEXT,
    role VARCHAR(12) CHECK(role IN ('superadmin', 'storeadmin')) NOT NULL,
    store_id INTEGER, -- NULL for superadmin
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

select * from products where id = 5;
select * from stock_movements LIMIT 2 OFFSET 4;
select * from products p join stocks s on s.product_id = p.id join stores s1 on s1.id = s.store_id where p.id = 5;
select COUNT(*) from products p join stocks s on s.product_id = p.id join stores s1 on s1.id = s.store_id;
DROP TABLE users;
DROP TABLE stores;
DROP TABLE stocks;
DROP TABLE stock_movements;
DROP TABLE Products;
