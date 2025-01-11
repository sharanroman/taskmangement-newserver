const jwt = require("jsonwebtoken");

// Token generation function
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },  // Payload
    process.env.JWT_SECRET || "mySecretKey",  // Secret
    { expiresIn: '365d' }  // Optional: Set a very long expiration or no expiration
  );
};

// Authentication middleware
const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.user = decoded;
    next();
  });
};



module.exports = { authenticate, generateToken };
