const express = require('express');
const { addTheProduct, updateTheStock, getTheProduct, getStockMovements, getAllProducts, getOverStockedProducts, addTheStore, updateStore, removeStore, updateProduct } = require('../cntrollers/handlers.controllers');
const router = express.Router();

router.post('/product', addTheProduct)
router.put('/product', updateProduct)
router.post('/store', addTheStore)
router.put('/store', updateStore)
router.delete('/store', removeStore)
router.post('/updateStock', updateTheStock)
router.get('/product', getTheProduct)
router.get('/stockMovements/:id', getStockMovements)
router.get('/products', getAllProducts)
router.get('/overStock', getOverStockedProducts)


module.exports = router;