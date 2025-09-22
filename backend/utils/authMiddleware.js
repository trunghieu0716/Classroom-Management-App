const { db } = require('../config/firebaseAdmin');

/**
 * Check if the auth token is valid
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization token' });
    }
    
    const token = authHeader.split(' ')[1];
    console.log('Token received:', token);
    
    // Check if the token is valid in either users or students collection
    const instructorsQuery = await db.collection('users')
      .where('sessionToken', '==', token)
      .where('userType', '==', 'instructor')
      .where('isActive', '==', true)
      .get();
      
    if (instructorsQuery.empty) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Set user data for route handlers
    const userData = instructorsQuery.docs[0].data();
    const userId = instructorsQuery.docs[0].id; // This is actually the phone number
    
    console.log('Auth middleware found user:', userId);
    console.log('User data from auth:', userData);
    
    // Ensure phoneNumber is set in req.user
    req.user = {
      ...userData,
      phoneNumber: userId // Make sure phoneNumber is set to the document ID
    };
    req.userId = userId;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

module.exports = authMiddleware;