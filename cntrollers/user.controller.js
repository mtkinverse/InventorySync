const db = require('../modules/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

exports.signup = async (req, res) => {
    try {
        const { username, password, role, store_id } = req.body;

        if (req.user.role != 'superadmin') return res.status(401).json({ message: 'Only admins can signup!' })

        if (role != 'storeadmin') {
            return res.status(400).json({ message: 'Invalid role' });
        }

        if (role === 'storeadmin' && !store_id) {
            return res.status(400).json({ message: 'Store ID required for storeadmin' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const existingUser = await db.connection.query('SELECT id FROM users WHERE username = ?', [username])
        if (existingUser[0][0]) return res.status(400).json({ message: 'A user with the provided user name already exists' })

        const result = await db.connection.query(
            `INSERT INTO users (username, password, role, store_id) VALUES (?, ?, ?, ?)`,
            [username, hashedPassword, role, role === 'storeadmin' ? store_id : null]
        );

        res.status(201).json({ message: 'User created successfully', userId: result.lastID });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        const userMeta = await db.connection.query(`SELECT * FROM users WHERE username = ?`, [username]);
        const user = { ...userMeta[0][0] }
        // console.log('username password and user', username, password, user)
        if (!user) return res.status(404).json({ message: 'User not found' });


        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign({
            id: user.id,
            role: user.role,
            store_id: user.store_id
        }, JWT_SECRET, { expiresIn: '1d' });

        res.json({ token });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
