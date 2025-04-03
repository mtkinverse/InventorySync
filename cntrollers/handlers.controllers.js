const db = require('../modules/db');

module.exports.addTheProduct = async (req, res) => {
    try {
        const { name, category, price, description, store_id, current_stock } = req.body;

        // Step 1: Add product to the products table
        const product = await db.addProduct(name, category, price, description, store_id, current_stock);

        // Step 2: Add initial stock in the product_stocks table

        res.status(200).json({
            message: `Product ${name} added successfully to Store ${store_id}`,
            product
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.updateTheStock = async (req, res) => {
    try {
        const { product_id, store_id, quantity_change, movement_time } = req.body;

        await db.updateStock(product_id, store_id, quantity_change, movement_time);

        res.status(200).json({ message: `Stock updated successfully for Product ID: ${product_id} in Store ID: ${store_id}` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.getTheProduct = async (req, res) => {
    try {
        const { product_id, store_id } = req.query;
        const product = await db.getProduct(product_id, store_id);

        // const stock = await db.getProductStockAcrossStores(id); // NEW: get total or per-store stock
        res.status(200).json({ product });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.updateProduct = async (req, res) => {
    try {
        // const product_id = req.body.product_id
        const { product_id, store_id } = req.body;
        const connection = db.getStoreShard(store_id)
        const [[product]] = await connection.query('SELECT * FROM products where id = ?', [product_id])

        if (!product) {
            return res.status(400).json({ message: 'No such product exists' })
        }
        const name = req.body.name || product.name
        const price = req.body.price || product.price
        const description = req.body.description || product.description
        const category = req.body.category || product.category

        await connection.query('Update products set name = ?, price = ?, description = ?, category = ? where id = ?', [name, price, description, category, product_id])

        return res.status(200).json({ message: 'Product Updated Successfully' })

    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

module.exports.getStockMovements = async (req, res) => {
    try {
        const limit = 10
        let { store_id, product_id, reason, to, from, page = 1 } = req.query;

        page = parseInt(page)
        if (page <= 0) return res.status(400).json({ message: 'Pages cannot be zero or less' })
        const offset = (page - 1) * limit

        const connection = db.getStoreShard(store_id);

        if (product_id) {

            const [[{ total }]] = await connection.query(`SELECT COUNT(*) as total FROM stock_movements WHERE product_id = ? and store_id = ? ${reason ? `AND reason = '${reason}'` : ''} ${from ? ` AND movement_time >= '${from}'` : ''} ${to ? ` AND movement_time <= '${to}'` : ''} ORDER BY movement_time DESC`, [product_id, store_id])
            const totalPages = Math.ceil(total / limit)

            const [rows] = await connection.query(
                `SELECT * FROM stock_movements WHERE product_id = ? and store_id = ? ${reason ? `AND reason = '${reason}'` : ''} ${from ? ` AND movement_time >= '${from}'` : ''} ${to ? ` AND movement_time <= '${to}'` : ''} ORDER BY movement_time DESC LIMIT ? OFFSET ?`,
                [product_id, store_id, limit, offset]
            );
            res.status(200).json({ total_pages: totalPages, hasMore: page < totalPages, limit, page, store_id, product_id, movements: rows })

        }
        else {

            const [[{ total }]] = await connection.query(`SELECT COUNT(*) as total FROM stock_movements WHERE store_id = ? ${reason && `AND reason = '${reason}'`} ${from ? ` AND movement_time >= '${from}'` : ''} ${to ? ` AND movement_time <= '${to}'` : ''} ORDER BY movement_time DESC`, [product_id, store_id])
            const totalPages = Math.ceil(total / limit)

            const [rows] = await connection.query(
                `SELECT * FROM stock_movements WHERE store_id = ? ${reason && `AND reason = '${reason}'`} ${from ? ` AND movement_time >= '${from}'` : ''} ${to ? ` AND movement_time <= '${to}'` : ''} ORDER BY movement_time DESC LIMIT ? OFFSET ?`,
                [store_id, limit, offset]
            );
            res.status(200).json({ total_pages: totalPages, hasMore: page < totalPages, limit, page, store_id, movements: rows });

        }

        // if (product_id)
        //     res.status(200).json({ store_id, product_id, movements })
        // else
        //     res.status(200).json({ store_id, movements });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.getAllProducts = async (req, res) => {
    try {
        const limit = 10
        let { store_id, page = 1 } = req.query;

        page = parseInt(page);

        if (page <= 0) return res.status(400).json({ message: "Page number cannot be negative or zero" })
        const offset = (page - 1) * limit;

        const connection = db.getStoreShard(store_id)

        const [rows] = await connection.query(`SELECT * FROM products p JOIN stocks s ON p.id = s.product_id where s.store_id = ? LIMIT ? OFFSET ?`, [store_id, limit, offset]);
        const [[{ total }]] = await connection.query(`SELECT COUNT(*) as total FROM products p JOIN stocks s ON p.id = s.product_id`);

        const totalPages = Math.ceil(total / limit);
        const hasMore = totalPages > page

        res.status(200).json({ total_pages: totalPages, page, limit, hasMore, products: rows });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// module.exports.removeAllProducts = async (req, res) => {
//     try {
//         await db.removeAll();
//         res.status(200).json({ message: 'All products removed successfully' });
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

const formatDateForMySQL = (date) => {
    return date.toISOString().slice(0, 19).replace("T", " ");
};



module.exports.getOverStockedProducts = async (req, res) => {
    try {
        const { from, to, store_id, threshold = 0.3 } = req.query;

        // const toDate = to || new Date();
        let tempDate = new Date()
        tempDate.setMonth(tempDate.getMonth() - 1)
        // const fromDate = from || tempDate.setMonth(tempDate.getMonth() - 1);
        const fromDate = formatDateForMySQL(from || tempDate);
        const toDate = formatDateForMySQL(to || new Date());

        const connection = db.getStoreShard(store_id)

        const [rows] = await connection.query(
            `SELECT p.id, t1.sales/t2.purchases as sToP from products p
            join (
                select product_id, abs(sum(quantity_changed) * 1.0) as sales from stock_movements where store_id = ${store_id} and reason = 'sale' and movement_time >= '${fromDate}' and movement_time <= '${toDate}' group by product_id
            ) t1 on p.id = t1.product_id
            join (
                select product_id, sum(quantity_changed) * 1.0 as purchases from stock_movements where store_id = ${store_id} and reason = \'stock-in\' and movement_time >= '${fromDate}' and movement_time <= '${toDate}' group by product_id
            ) t2 on p.id = t2.product_id
             JOIN stocks s1 ON s1.product_id = p.id JOIN stores s2 ON s1.store_id = s2.id
             where store_id = ${store_id} and t1.sales/t2.purchases < ${threshold}
             order by sToP desc LIMIT 5`
        );

        res.status(200).json({ overStocked: rows });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.addTheStore = async (req, res) => {
    try {
        const { name, address } = req.body;
        const store = await db.addStore(name, address)
        res.status(200).json({ message: 'Store added successfully', details: store })
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
}

// exports.addStore = async (req, res) => {
//     try {
//         const { name, address } = req.body;
//         const [result] = await connection.query(`INSERT INTO stores (name, address) VALUES (?, ?)`, [name, address]);
//         res.status(201).json({ message: 'Store added', storeId: result.insertId });
//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// };

exports.removeStore = async (req, res) => {
    try {
        const { store_id } = req.params;
        const connection = db.getStoreShard(store_id)
        await connection.query(`DELETE FROM stores WHERE id = ?`, [store_id]);
        res.json({ message: 'Store removed' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateStore = async (req, res) => {
    try {
        const { store_id, name, address } = req.body;
        const connection = db.getStoreShard(store_id)
        await connection.query(`UPDATE stores SET name = ?, address = ? WHERE id = ?`, [name, address, store_id]);
        res.json({ message: 'Store updated' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
