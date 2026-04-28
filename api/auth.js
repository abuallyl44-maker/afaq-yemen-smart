const { User } = require('../src/models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
    const { method, body, query } = req;

    // تسجيل الدخول
    if (method === 'POST' && req.url === '/login') {
        const { email, password } = body;
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(401).json({ error: 'بيانات غير صحيحة' });

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) return res.status(401).json({ error: 'بيانات غير صحيحة' });

        const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        return res.json({ token, user: { id: user.user_id, email: user.email } });
    }

    // تسجيل مستخدم جديد
    if (method === 'POST' && req.url === '/register') {
        const { email, password } = body;
        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({ email, password_hash: hashed });
        return res.status(201).json({ message: 'تم التسجيل بنجاح', userId: user.user_id });
    }

    // إذا لم يطابق أي مسار
    res.status(404).json({ error: 'مسار غير موجود' });
};