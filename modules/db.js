const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

const connection = db.promise();

const DB = {
    async addProduct(name, category, price, description, store_id, current_stock) {
        const [result] = await connection.query(
            `INSERT INTO products (name, category, price, description) VALUES (?, ?, ?, ?)`,
            [name, category, price, description]
        );

        const [movement_id] = await connection.query('INSERT INTO stocks (product_id, store_id, stock) VALUES (?, ?, ?)', [result.insertId, store_id, current_stock])

        const [rows] = await connection.query(`SELECT * FROM products WHERE id = ?`, [result.insertId]);
        return rows[0];
    },

    async getAllProduct(storeId) {
        const [rows] = await connection.query(`SELECT * FROM products p JOIN stocks s ON p.id = s.product_id where s.store_id = ?`, [storeId]);
        return rows;
    },

    async getProduct(productId, storeId) {
        if (!storeId) {
            const [rows] = await connection.query(`SELECT * FROM products where id = ?  `, [productId]);
            return rows[0];
        } else {
            const [rows] = await connection.query(`SELECT p.*,s1.name as store_name, s1.address as store_address FROM products p JOIN stocks s on s.product_id = p.id JOIN stores s1 on s1.id = s.store_id `, [productId]);
            return rows[0];
        }
    },

    async updateStock(productId, storeId, quantityChange, reason) {
        try {
            await connection.beginTransaction();

            const [[product]] = await connection.query(`SELECT * FROM products WHERE id = ?`, [productId]);
            if (!product) throw new Error('Product not found');

            const [[stock]] = await connection.query('SELECT * from stocks where product_id = ? and store_id = ?', [productId, storeId])
            console.log('found stock ', stock)
            const newStock = parseInt(stock.stock) + parseInt(quantityChange);
            if (newStock < 0) throw new Error('Insufficient stock');

            // console.log('updating product to ', { ...product, current_stock: newStock })
            // await connection.query(`UPDATE products SET current_stock = ? WHERE id = ?`, [newStock, productId]);

            await connection.query(`UPDATE stocks SET stock = ? WHERE store_id = ? and product_id = ?`, [newStock, storeId, productId]);

            await connection.query(
                `INSERT INTO stock_movements (product_id, store_id, quantity_changed, reason) VALUES (?, ?, ?, ?)`,
                [productId, storeId, quantityChange, reason]
            );

            await connection.commit();
        } catch (err) {
            await connection.rollback();
            throw err;
        }
    },

    async getStockMovements(storeId, productId) {
        if (productId) {

            const [rows] = await connection.query(
                `SELECT * FROM stock_movements WHERE product_id = ? and store_id = ? ORDER BY movement_time DESC LIMIT 25`,
                [productId, storeId]
            );
            return rows;
        }
        else {
            const [rows] = await connection.query(
                `SELECT * FROM stock_movements WHERE store_id = ? ORDER BY movement_time DESC LIMIT 25`,
                [productId, storeId]
            );
            return rows;
        }
    },

    async overStockedProducts(storeId, from, to, threshold = 0.3) {
        const toDate = to || new Date();
        const tempDate = new Date()
        const fromDate = from || tempDate.setMonth(tempDate.getMonth() - 1);
        const [rows] = await connection.query(
            `SELECT p.id, t1.sales/t2.purchases as sToP from products p
            join (
                select product_id, abs(sum(quantity_changed) * 1.0) as sales from stock_movements where store_id = ${storeId} and reason = 'sale' and movement_time >= ${fromDate} and movement_time <= ${toDate} group by product_id
            ) t1 on p.id = t1.product_id
            join (
                select product_id, sum(quantity_changed) * 1.0 as purchases from stock_movements where store_id = ${storeId} and reason = \'stock-in\' and movement_time >= ${fromDate} and movement_time <= ${toDate} group by product_id
            ) t2 on p.id = t2.product_id
             where t1.sales/t2.purchases < ?
             order by sToP desc LIMIT 5`,
            [threshold]
        );
        return rows;
    },

    async addStore(name, address) {

        const [result] = await connection.query('INSERT INTO stores (name,address) VALUES (?,?)', [name, address]);
        return { id: result.insertId, name: name, address: address };

    },

    async removeAll() {
        await connection.query(`DELETE FROM stock_movements`);
        await connection.query(`DELETE FROM products`);
    },

    closeDatabase() {
        db.end((err) => {
            if (err) {
                console.error('Error closing the database:', err);
            } else {
                console.log('Database connection closed.');
            }
        });
    }
};

module.exports = { ...DB, connection };