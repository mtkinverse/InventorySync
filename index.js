const express = require('express');
const app = express();
const serverRoutes = require('./routes/server.route')
const userRoutes = require('./routes/user.route')
const rateLimiter = require('./middlewares/rateLimiter')
const cors = require('cors');
const { auth } = require('./middlewares/auth');
const PORT = process.env.PORT;

app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173']
}));
app.use(auth);
// app.use(rateLimiter)
app.use(serverRoutes);
app.use(userRoutes);


app.get('/', (req, res) => {
    res.send('This is server of the legend Taha khan!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});