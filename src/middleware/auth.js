const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * التحقق من صحة JWT
 */
async function authenticate(req, res, next) {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.userId);
        
        if (!user || user.status !== 'active') {
            return res.status(401).json({ error: 'Unauthorized: User not found or inactive' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
}

/**
 * التحقق من صلاحيات المشرف
 */
async function requireAdmin(req, res, next) {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.userId);
        
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
}

/**
 * التحقق من صلاحيات المالك أو المشرف
 */
async function requireOwnerOrAdmin(req, res, next) {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized: User not found' });
        }
        
        // السماح للمشرفين أو لمالك المورد
        if (user.role === 'admin') {
            req.user = user;
            return next();
        }
        
        // التحقق من ملكية المورد (يحتاج إلى معرف المورد في req.params)
        const resourceUserId = req.params.userId || req.body.userId;
        
        if (user.user_id == resourceUserId) {
            req.user = user;
            return next();
        }
        
        return res.status(403).json({ error: 'Forbidden: You do not own this resource' });
    } catch (error) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
}

module.exports = {
    authenticate,
    requireAdmin,
    requireOwnerOrAdmin
};