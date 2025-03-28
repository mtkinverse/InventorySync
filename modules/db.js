const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./inventory.db', err => {
    if (err) console.log(err.message)
    else console.log('successfully connected to the DB')
});

db.run("PRAGMA foreign_keys = ON;");

db.serialize(() => {

    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT,
        price REAL NOT NULL,
        description TEXT,
        current_stock INTEGER DEFAULT 0 CHECK(current_stock >= 0)
    )`);


    db.run(`CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        change INTEGER NOT NULL,
        reason TEXT CHECK(reason IN ('stock-in', 'sale', 'removed')),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`);

    // The trigger was applied but wasn't able to detect manual removals

    // db.run(`
    //     CREATE TRIGGER IF NOT EXISTS update_stock_trigger
    //     AFTER UPDATE OF current_stock ON products
    //     FOR EACH ROW
    //     WHEN NEW.current_stock >= 0
    //     BEGIN
    //         INSERT INTO stock_movements (product_id, change, reason)
    //         VALUES (NEW.id, NEW.current_stock - OLD.current_stock,
    //                 CASE WHEN NEW.current_stock > OLD.current_stock THEN 'stock-in' ELSE 'sale' END);
    //     END;`);



});

const addProduct = (name, category, price, description, current_stock) => {
    return new Promise((resolve, reject) => {
        const sql = `INSERT INTO products (name, category, price, description, current_stock) VALUES (?, ?, ?, ?, ?)`;
        db.run(sql, [name, category, price, description, current_stock], function (err) {

            const productId = this.lastID
            if (err) return reject(err);
            else {
                if (current_stock > 0) {
                    const moveQuery = 'INSERT INTO stock_movements (product_id, change, reason) values (?,?,?)'
                    db.run(moveQuery, [productId, current_stock, 'stock-in'], err2 => {
                        if (err2) return reject(err2)
                    })
                }
                resolve({ id: productId, name, category, price, description, current_stock });
            }
        });
    });
};

const updateStock = (productId, change, reason) => {
    console.log('called for ', productId, reason, change)
    return new Promise((resolve, reject) => {
        db.run(`UPDATE products SET current_stock = current_stock + ? WHERE id = ?`, [change, productId], function (err) {
            if (err) return reject(err);
            else {
                const q = 'INSERT INTO stock_movements (product_id, change, reason) values (?,?,?)'
                db.run(q, [productId, change, reason], function (err2) {
                    if (err2) return reject(err2)
                })
                resolve({ productId, change });
            }
        });
    });
};

const getProduct = (productId) => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM products WHERE id = ?`, [productId], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

const getAllProduct = () => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM products`, [], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

const getStockMovements = (productId) => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM stock_movements WHERE product_id = ? ORDER BY timestamp DESC`, [productId], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};


const removeAll = () => {
    return new Promise((resolve, reject) => {
        const q = 'DELETE FROM products; DELETE FROM stock_movements'
        db.run(q, [], (err, result) => {
            if (err) return reject(err)
            else return resolve('All data removed')
        })
    })
}

const closeDatabase = () => {
    db.close((err) => {
        if (err) console.error(err.message);
        else console.log('Database connection closed.');
    });
};

const overStockedProducts = () => {
    return new Promise((resolve, reject) => {
        const q = ` SELECT p.id, t1.sales/t2.purchases as sToP from products p
            join (
                select product_id, abs(sum(change) * 1.0) as sales from stock_movements where reason = \'sale\' and timestamp >= DATE(\'now\',\'-1 month\') group by product_id
            ) t1 on p.id = t1.product_id
            join (
                select product_id, sum(change) * 1.0 as purchases from stock_movements where reason = \'stock-in\' and timestamp >= DATE(\'now\',\'-1 month\') group by product_id
            ) t2 on p.id = t2.product_id
             where sToP < 0.5
             order by sToP desc LIMIT 5
        `

        db.all(q, [], (err, result) => {
            if (err) return reject(err)
            else return resolve(result)
        })
    })
}

module.exports = {
    db,
    addProduct,
    updateStock,
    getProduct,
    getStockMovements,
    closeDatabase,
    getAllProduct,
    removeAll,
    overStockedProducts
};