fetchrequire('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./models/User.js');
const Review = require('./models/Review.js');
const path = require('path');
const cors = require('cors');


const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' directory
app.use((req, res, next) => {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }
    next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// JWT middleware
function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1]; // Get token after 'Bearer'

    if (!token) return res.status(403).json({ error: 'Not authenticated' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
}


// Register a new user
app.post('/register', async (req, res) => {
    const { name, email, site, password } = req.body;

    if (!name || !email || !site || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Additional check (optional): Validate password length
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    try {
        // Check for existing user with the same site or email
        const existingUserBySite = await User.findOne({ site });
        if (existingUserBySite) {
            return res.status(400).json({ error: 'Site name must be unique' });
        }

        const existingUserByEmail = await User.findOne({ email });
        if (existingUserByEmail) {
            return res.status(400).json({ error: 'Email must be unique' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, site, password: hashedPassword });
        await newUser.save();

        // Generate a token after successful registration
        const token = jwt.sign({ id: newUser._id, email: newUser.email, site: newUser.site }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({ message: 'User registered successfully', token });
    } catch (error) {
        res.status(500).json({ error: 'Could not register user' });
    }
});



// Authenticate user
app.post('/authenticate', async (req, res) => {
    const { email, site, password } = req.body;

    try {
        const user = await User.findOne({ email, site });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id, email: user.email, site: user.site }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ success: true, message: 'Authenticated successfully', token });
    } catch (error) {
        res.status(500).json({ error: 'Could not authenticate user' });
    }
});

// Fetch reviews
app.get('/reviews', authenticateToken, async (req, res) => {
    const site = req.query.site;

    try {
        const reviews = site ? await Review.find({ site }) : await Review.find();
        res.status(200).json(reviews);
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch reviews' });
    }
});


// Fetch five random reviews without authentication
app.get('/random-reviews', async (req, res) => {
    const site = req.query.site;

    if (!site) {
        return res.status(400).json({ error: 'Site query parameter is required' });
    }

    try {
        // Fetch five random reviews for the specified site
        const reviews = await Review.aggregate([{ $match: { site } }, { $sample: { size: 5 } }]);
        res.status(200).json(reviews);
    } catch (error) {
        console.error('Error fetching random reviews:', error); // Log the error for debugging
        res.status(500).json({ error: 'Could not fetch reviews' });
    }
});



// Submit a new review (no authentication required)
app.post('/submit-review', async (req, res) => {
    const { name, email, review, site } = req.body;

    if (!name || !email || !review || !site) {
        return res.status(400).json({ error: 'Invalid input' });
    }

    try {
        const newReview = new Review({ name, email, review, site, timestamp: new Date().toISOString() });
        await newReview.save();
        
        
        res.status(201).json({ message: 'Review submitted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Could not save review' });
    }
});



// Delete a reviewF
app.delete('/deleteReview', authenticateToken, async (req, res) => {
    const { email, timestamp } = req.query;

    if (!email || !timestamp) {
        return res.status(400).json({ error: 'Missing email or timestamp' });
    }

    try {
        const result = await Review.findOneAndDelete({ email, timestamp });
        if (!result) {
            return res.status(404).json({ error: 'Review not found' });
        }
        res.status(200).json({ message: 'Review deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Could not delete review' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
