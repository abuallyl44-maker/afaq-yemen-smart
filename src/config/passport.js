/**
 * إعدادات Passport.js للمصادقة
 */

const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { User } = require('../models');

// استراتيجية JWT
const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET
};

passport.use(new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
        const user = await User.findByPk(payload.userId, {
            attributes: { exclude: ['password_hash', 'verification_code', 'code_expiry'] }
        });
        
        if (!user || user.status !== 'active') {
            return done(null, false);
        }
        
        return done(null, user);
    } catch (error) {
        return done(error, false);
    }
}));

// تهيئة Passport
function initializePassport(app) {
    app.use(passport.initialize());
}

module.exports = {
    initializePassport,
    passport
};