/**
 * خدمة الذكاء الاصطناعي باستخدام Open Router API
 */

const axios = require('axios');
const { AISetting, User, CatalogItem } = require('../models');

/**
 * معالجة رسالة العميل باستخدام الذكاء الاصطناعي
 */
async function processWithAI(userId, customerMessage, senderId) {
    try {
        const aiSettings = await AISetting.findOne({
            where: { user_id: userId }
        });

        if (!aiSettings?.is_enabled) {
            return null;
        }

        const user = await User.findByPk(userId);
        
        // جلب المنتجات والخدمات
        const products = await CatalogItem.findAll({
            where: { user_id: userId, type: 'product', is_active: true },
            limit: 20
        });
        
        const services = await CatalogItem.findAll({
            where: { user_id: userId, type: 'service', is_active: true },
            limit: 20
        });
        
        const offers = await CatalogItem.findAll({
            where: { user_id: userId, type: 'offer', is_active: true, end_date: { [Op.gte]: new Date() } },
            limit: 10
        });

        // بناء الـ Prompt
        const productsText = products.map(p => `• ${p.name}: ${p.price} ريال - ${p.description?.substring(0, 100) || ''}`).join('\n');
        const servicesText = services.map(s => `• ${s.name}: ${s.price} ريال - ${s.description?.substring(0, 100) || ''}`).join('\n');
        const offersText = offers.map(o => `• ${o.name}: خصم ${o.discount}% - ${o.description?.substring(0, 100) || ''} (ينتهي ${new Date(o.end_date).toLocaleDateString('ar')})`).join('\n');

        const prompt = `
أنت بوت خدمة عملاء يعمل لحساب مؤسسة "${user.company_name}".

📋 معلومات عن المؤسسة:
- نوع النشاط: ${user.business_type || 'عام'}
- وصف المؤسسة: ${user.company_description?.substring(0, 500) || ''}

🛍️ المنتجات المتاحة:
${productsText || 'لا توجد منتجات'}

🛠️ الخدمات المتاحة:
${servicesText || 'لا توجد خدمات'}

🎁 العروض الحالية:
${offersText || 'لا توجد عروض'}

قواعد الرد:
1. إذا كان العميل يريد الشراء، اطلب منه: الاسم الكامل، العنوان، رقم الهاتف
2. إذا استفسر عن منتج أو خدمة، أجب بالمعلومات المتاحة
3. إذا اشتكى، اعتذر واطلب التفاصيل للمتابعة
4. استخدم نبرة ${aiSettings.tone}
5. لا تذكر أنك ذكاء اصطناعي، تحدث كموظف خدمة عملاء

رسالة العميل: "${customerMessage}"

قم بالرد على العميل بشكل مناسب:
`;

        // استدعاء Open Router API
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: aiSettings.model_name || process.env.OPENROUTER_MODEL,
                messages: [
                    { role: 'system', content: 'أنت بوت خدمة عملاء محترف ولطيف.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: aiSettings.max_tokens,
                temperature: parseFloat(aiSettings.temperature)
            },
            {
                headers: {
                    'Authorization': `Bearer ${aiSettings.api_key || process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const aiResponse = response.data.choices[0]?.message?.content;
        
        // تحليل النية (إذا كان مفعلاً)
        if (aiSettings.analyze_intent) {
            const intent = await analyzeIntent(customerMessage, aiResponse);
            if (intent === 'purchase') {
                // إحالة الطلب إلى المجموعة المحددة
                await forwardPurchaseRequest(userId, senderId, customerMessage);
            }
        }

        return aiResponse;
    } catch (error) {
        console.error('AI processing error:', error);
        
        // رسالة احتياطية
        const aiSettings = await AISetting.findOne({ where: { user_id: userId } });
        return aiSettings?.fallback_message || 'عذراً، حدث خطأ. يرجى المحاولة لاحقاً أو التواصل مع الدعم.';
    }
}

/**
 * تحليل نية العميل
 */
async function analyzeIntent(message, aiResponse) {
    const purchaseKeywords = ['اشتري', 'أريد شراء', 'كم سعر', 'اطلب', 'طلب', 'شراء'];
    const lowerMessage = message.toLowerCase();
    
    for (const keyword of purchaseKeywords) {
        if (lowerMessage.includes(keyword)) {
            return 'purchase';
        }
    }
    return 'inquiry';
}

/**
 * إحالة طلب الشراء إلى المجموعة المحددة
 */
async function forwardPurchaseRequest(userId, customerId, message) {
    // الحصول على إعدادات الإحالة من قاعدة البيانات
    // إرسال إشعار إلى مجموعة تيليجرام المحددة
    console.log(`Purchase request from ${customerId}: ${message}`);
    // TODO: إرسال إلى تيليجرام
}

module.exports = {
    processWithAI
};