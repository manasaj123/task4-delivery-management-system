const pool = require('../utils/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class User {
  // Find user by email
  static async findByEmail(email) {
    try {
      const [users] = await pool.execute(
        'SELECT id, name, email, password, role FROM users WHERE email = ?', [email]
      );
      return users[0];
    } catch (error) {
      throw new Error(`User lookup failed: ${error.message}`);
    }
  }

  // Create new user
  static async create(userData) {
    try {
      const { name, email, password, role } = userData;
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const [result] = await pool.execute(`
        INSERT INTO users (name, email, password, role) 
        VALUES (?, ?, ?, ?)
      `, [name, email, hashedPassword, role || 'admin']);

      const [user] = await pool.execute(
        'SELECT id, name, email, role FROM users WHERE id = ?', [result.insertId]
      );
      return user[0];
    } catch (error) {
      throw new Error(`User creation failed: ${error.message}`);
    }
  }

  // User login with JWT
  static async login(email, password) {
    try {
      const user = await this.findByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role }, 
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      };
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  // Verify JWT token
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

module.exports = User;
