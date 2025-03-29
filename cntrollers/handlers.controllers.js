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
        const { product_id, store_id, quantity_change, movement_type } = req.body;

        await db.updateStock(product_id, store_id, quantity_change, movement_type);

        res.status(200).json({ message: `Stock updated successfully for Product ID: ${product_id} in Store ID: ${store_id}` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.getTheProduct = async (req, res) => {
    try {
        const { id, store_id } = req.query;
        const product = await db.getProduct(id, store_id);
        // const stock = await db.getProductStockAcrossStores(id); // NEW: get total or per-store stock
        res.status(200).json({ product });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.updateProduct = async (req, res) => {
    try {
        const product_id = req.body.product_id
        const [[product]] = await db.connection.query('SELECT * FROM products where id = ?', [product_id])

        if (!product) {
            return res.status(400).json({ message: 'No such product exists' })
        }
        const name = req.body.name || product.name
        const price = req.body.price || product.price
        const description = req.body.description || product.description
        const category = req.body.category || product.category

        await db.connection.query('Update products set name = ?, price = ?, description = ?, category = ? where id = ?', [name, price, description, category, product_id])

        return res.status(200).json({ message: 'Product Updated Successfully' })

    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

module.exports.getStockMovements = async (req, res) => {
    try {
        const { store, product } = req.query;
        const movements = await db.getStockMovements(store, product);
        if (product)
            res.status(200).json({ store, product, movements })
        else
            res.status(200).json({ store, movements });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports.getAllProducts = async (req, res) => {
    try {
        const { store_id } = req.params;
        const products = await db.getAllProduct(store_id);
        res.status(200).json({ products });
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

module.exports.getOverStockedProducts = async (req, res) => {
    try {
        const { threshold = 0.3 } = req.query;
        const products = await db.overStockedProducts(store, threshold);
        res.status(200).json({ overStocked: products });
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
//         const [result] = await db.connection.query(`INSERT INTO stores (name, address) VALUES (?, ?)`, [name, address]);
//         res.status(201).json({ message: 'Store added', storeId: result.insertId });
//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// };

exports.removeStore = async (req, res) => {
    try {
        const { store_id } = req.params;
        await db.connection.query(`DELETE FROM stores WHERE id = ?`, [store_id]);
        res.json({ message: 'Store removed' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateStore = async (req, res) => {
    try {
        const { store_id, name, location } = req.body;
        await db.connection.query(`UPDATE stores SET name = ?, location = ? WHERE id = ?`, [name, location, store_id]);
        res.json({ message: 'Store updated' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
