// check the DB modulex
// implement middle ware for limitation
const db = require('./modules/db');

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

const ask = (query) => new Promise(resolve => readline.question(query, resolve));


const runner = async () => {
    try {

        // const q = 'select * from stock_movements'
        // const q = 'select product_id, sum(change) as purchases from stock_movements where reason = \'stock-in\' group by product_id'
        // const q = 'SELECT p.id, t1.sales/t2.purchases as sToP from products p join (select product_id, abs(sum(change) * 1.0) as sales from stock_movements where reason = \'sale\' group by product_id) t1 on p.id = t1.product_id join (select product_id, sum(change) * 1.0 as purchases from stock_movements where reason = \'stock-in\' group by product_id) t2 on p.id = t2.product_id order by sToP desc LIMIT 5'

        // const q = 'select CURRENT_TIMESTAMP > DATE(\'now\',\'-1 month\') as what'
        // db.db.all(q, [], (err, result) => {
        //     if (err) console.error(err)
        //     console.log(result);
        // })

        await db.removeAll()
        let exit = false;

        while (!exit) {
            console.log('\n------ MENU ------');
            console.log('1. Add New Product');
            console.log('2. View Product Details');
            console.log('3. View All Products');
            console.log('4. Update Stock of Product');
            console.log('5. View Overstocked Products');
            console.log('6. View Stock movements of Product');
            console.log('0. Exit');
            const choice = await ask('Enter your choice: ');

            switch (choice) {
                case '1':
                    const name = await ask('Enter product name: ');
                    const category = await ask('Enter category: ');
                    const price = parseFloat(await ask('Enter price: '));
                    const description = await ask('Enter description: ');
                    const quantity = parseInt(await ask('Enter quantity: '));
                    const newProd = await db.addProduct(name, category, price, description, quantity);
                    console.log('Product added with ID:', newProd.id);
                    break;

                case '2':
                    const prodId = parseInt(await ask('Enter product ID to view: '));
                    const product = await db.getProduct(prodId);
                    if (product) {
                        console.log('Product Details:', product);
                    } else {
                        console.log('Product not found!');
                    }
                    break;

                case '3':
                    const allProducts = await db.getAllProduct();
                    console.log('All Products in Inventory:\n', allProducts);
                    break;

                case '4':
                    const idToUpdate = parseInt(await ask('Enter product ID to update stock: '));
                    const qtyChange = parseInt(await ask('Enter quantity change (+ve for stock-in, -ve for sale): '));
                    const reason = await ask('Enter reason (e.g., stock-in / sale / removed): ');
                    try {
                        await db.updateStock(idToUpdate, qtyChange, reason);
                        console.log('Stock updated successfully.');
                    } catch (err) {
                        console.log('Error updating stock:', err.message);
                    }
                    break;

                case '5':
                    const badProducts = await db.overStockedProducts();
                    if (badProducts.length === 0) {
                        console.log('No overstocked products.');
                    } else {
                        console.log('Overstocked Products:');
                        for (const prod of badProducts) {
                            console.log({ ...await db.getProduct(prod.id), prod });
                        }
                    }
                    break;

                case '6':

                    const productId = parseInt(await ask('Enter the Product ID to view its stock movements: '));

                    try {
                        const product = await db.getProduct(productId);
                        if (!product) {
                            console.log('Product not found!');
                            break;
                        }

                        const stockMovements = await db.getStockMovements(productId);
                        if (stockMovements.length === 0) {
                            console.log(`No stock movement records found for "${product.name}".`);
                        } else {
                            console.log(`\n--- Stock Movements for "${product.name}" ---`);
                            for (const record of stockMovements) {
                                console.log(`- [${record.timestamp}] Qty: ${record.change} | Reason: ${record.reason}`);
                            }
                        }
                    } catch (err) {
                        console.error('Error retrieving stock movements:', err.message);
                    }
                    break;


                case '0':
                    exit = true;
                    readline.close();
                    db.closeDatabase();
                    break;

                default:
                    console.log('Invalid option, please try again.');
            }
        }


        console.log('Exited. Goodbye!');

    } catch (err) {
        console.error('Error:', err.message);
    }

}

runner()