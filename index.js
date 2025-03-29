const express = require('express');
const app = express();
const serverRoutes = require('./routes/server.route')
const cors = require('cors');
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(serverRoutes);

app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173']
}));

app.get('/', (req, res) => {
    res.send('Hunt Data with data dungeon!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});