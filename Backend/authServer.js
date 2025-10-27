// backend/authServer.js

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = 8080;
const JWT_SECRET = 'your_super_secret_key_that_is_long_and_secure';

app.use(cors());
app.use(express.json());

// --- Database Connection ---
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'CoinMatrix',
  password: 'Dl7ch@5965',
  port: 5432,
});

// --- API ROUTES ---

/**
 * @route   POST /api/signup
 * @desc    Register a new user
 * @access  Public
 */
app.post('/api/signup', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Please provide username, email, and password.' });
    }

    try {
        const userExists = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
        if (userExists.rowCount > 0) {
            return res.status(409).json({ message: 'Username or email already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username',
            [username, email, hashedPassword]
        );
        
        const user = newUser.rows[0];

        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        res.status(201).json({ message: 'User created successfully!', token, username: user.username });

    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ message: 'Server error during signup.' });
    }
});


/**
 * @route   POST /api/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Please provide username and password.' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rowCount === 0) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ message: 'Logged in successfully!', token, username: user.username });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`🔑 Auth server running on http://localhost:${PORT}`);
});