const mysql = require('mysql2');
require('dotenv').config();

const centralDB = mysql.createPool({
    host: 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'centralInventory'
}).promise();


const writers = [
    mysql.createPool({ host: process.env.PRIMARY_DB1, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: 'inventory1', connectionLimit: 10 }),
    mysql.createPool({ host: process.env.PRIMARY_DB2, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: 'inventory2', connectionLimit: 10 }),
    mysql.createPool({ host: process.env.PRIMARY_DB3, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: 'inventory3', connectionLimit: 10 })
].map(db => db.promise());

const shards = [
    mysql.createPool({ host: process.env.REPLICA_DB1, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: 'inventory1', connectionLimit: 10 }),
    mysql.createPool({ host: process.env.REPLICA_DB2, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: 'inventory2', connectionLimit: 10 }),
    mysql.createPool({ host: process.env.REPLICA_DB3, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: 'inventory3', connectionLimit: 10 })
].map(db => db.promise());

function getStoreShard(store_id, writer = false) {
    if (writer) return writers[store_id % writers.length]
    else return shards[store_id % shards.length];
}

async function getNextStoreId() {
    const [rows] = await centralDB.query(`SELECT next_id FROM tracker where entity = 0 order by next_id`);

    let nextId = 0;
    if (rows.length > 0) {
        nextId = rows[0].next_id;
        await updateNextStoreId(nextId)
        // await centralDB.query('UPDATE tracker set next_id = ? where next_id = ?',[nextId + 1, nextId])
    } else {
        await centralDB.query(`INSERT INTO tracker (entity, next_id) VALUES (0, ?)`, [1]);
    }

    return nextId;
}

async function updateNextStoreId(lastUsedId) {
    await centralDB.query(`UPDATE tracker SET next_id = ? where next_id = ? and entity = 0`, [lastUsedId + 1, lastUsedId]);
}

const DB = {
    async addStore(name, address) {
        const storeId = await getNextStoreId();
        const shard = getStoreShard(storeId, true);

        const [result] = await shard.query('INSERT INTO stores (id, name, address) VALUES (?, ?, ?)', [storeId, name, address]);
        await updateNextStoreId(storeId);

        return { id: storeId, name, address };
    },

    async addProduct(name, category, price, description, store_id, current_stock) {

        const connection = await getStoreShard(store_id, true).getConnection();

        try {

            await connection.beginTransaction();
            // Insert product (ID auto-increment handled by MySQL)
            const [productResult] = await connection.query(
                `INSERT INTO products (name, category, price, description) VALUES (?, ?, ?, ?)`,
                [name, category, price, description]
            );

            const productId = productResult.insertId;

            // Insert stock
            await connection.query(
                `INSERT INTO stocks (product_id, store_id, stock) VALUES (?, ?, ?)`,
                [productId, store_id, current_stock]
            );

            // Commit transaction
            await connection.commit();

            return { id: productId, name, category, price, description, current_stock };
        } catch (error) {
            await connection.rollback();
            throw error;
        }
    },

    async getAllProducts(storeId, page = 1) {
        const connection = getStoreShard(storeId);
        const [rows] = await connection.query(
            `SELECT p.*, s.stock FROM products p
             JOIN stocks s ON p.id = s.product_id 
             WHERE s.store_id = ?`,
            [storeId]
        );
        return rows;
    },

    async getProduct(productId, storeId) {
        if (!storeId) return undefined;

        const connection = getStoreShard(storeId);
        const [rows] = await connection.query(
            `SELECT p.*, s.stock, st.name AS store_name, st.address AS store_address 
             FROM products p 
             JOIN stocks s ON s.product_id = p.id 
             JOIN stores st ON st.id = s.store_id 
             ${productId ? 'WHERE p.id = ? AND' : ''} s.store_id = ?`,
            [productId, storeId]
        );

        return rows[0] || null;
    },

    async updateStock(productId, storeId, quantityChange, reason) {

        const connection = await getStoreShard(storeId, true).getConnection();
        await connection.beginTransaction();

        try {
            // Fetch current stock
            const [[stock]] = await connection.query(
                `SELECT stock FROM stocks WHERE product_id = ? AND store_id = ?`,
                [productId, storeId]
            );

            if (!stock) throw new Error('Stock entry not found');

            const newStock = parseInt(stock.stock) + parseInt(quantityChange);
            if (newStock < 0) throw new Error('Insufficient stock');

            // Update stock
            await connection.query(
                `UPDATE stocks SET stock = ? WHERE store_id = ? AND product_id = ?`,
                [newStock, storeId, productId]
            );

            // Insert stock movement
            await connection.query(
                `INSERT INTO stock_movements (product_id, store_id, quantity_changed, reason) VALUES (?, ?, ?, ?)`,
                [productId, storeId, quantityChange, reason]
            );

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        }
    },

    async getStockMovements(storeId, productId = null) {
        const connection = getStoreShard(storeId);
        const query = productId
            ? `SELECT * FROM stock_movements WHERE product_id = ? AND store_id = ? ORDER BY movement_time DESC LIMIT 25`
            : `SELECT * FROM stock_movements WHERE store_id = ? ORDER BY movement_time DESC LIMIT 25`;

        const [rows] = await connection.query(query, productId ? [productId, storeId] : [storeId]);
        return rows;
    },

    async overStockedProducts(storeId, from, to, threshold = 0.3) {
        const connection = getStoreShard(storeId);
        // const tempDate = new Date()
        // tempDate.setMonth(tempDate.getMonth() - 1)
        // const fromDate = from || tempDate;
        // const toDate = to || new Date();
        // console.log('whattttt ', storeId, fromDate, toDate, threshold);

        const q = `SELECT p.id, (t1.sales / t2.purchases) AS sToP
             FROM products p
             JOIN (
                 SELECT product_id, ABS(SUM(quantity_changed)) AS sales 
                 FROM stock_movements 
                 WHERE store_id = ? AND reason = 'sale' ${from ? `AND movement_time >= '${from}'` : ''} ${to ? `AND movement_time <= '${to}'` : ''}
                 GROUP BY product_id
             ) t1 ON p.id = t1.product_id
             JOIN (
                 SELECT product_id, SUM(quantity_changed) AS purchases 
                 FROM stock_movements 
                 WHERE store_id = ? AND reason = 'stock-in' ${from ? `AND movement_time >= '${from}'` : ''} ${to ? `AND movement_time <= '${to}'` : ''}
                 GROUP BY product_id
             ) t2 ON p.id = t2.product_id
             WHERE (t1.sales / t2.purchases) < ?
             ORDER BY sToP DESC LIMIT 5`
        const [rows] = await connection.query(
            q,
            [storeId, storeId, threshold]
        );

        return rows;
    },

    async removeAll() {
        for (const shard of shards) {
            await shard.query(`DELETE FROM stock_movements`);
            await shard.query(`DELETE FROM products`);
        }
    },

    async closeDatabase() {
        for (const db of shards) {
            await db.end();
        }
        await centralDB.end();
        console.log('Database connections closed.');
    }
};

module.exports = { ...DB, getStoreShard, centralDB };
