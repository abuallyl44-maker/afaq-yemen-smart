const express = require('express');
const router = express.Router();
const { handleTelegramWebhook, handleWhatsAppWebhook, handlePaymentWebhook } = require('../services/webhookService');

/**
 * @route   POST /webhooks/telegram/:botToken
 * @desc    استقبال رسائل من تيليجرام
 * @access  Public (لكن محمي بالتكوين)
 */
router.post('/telegram/:botToken', handleTelegramWebhook);

/**
 * @route   POST /webhooks/whatsapp/:botId
 * @desc    استقبال رسائل من واتساب
 * @access  Public (لكن محمي بالتكوين)
 */
router.post('/whatsapp/:botId', handleWhatsAppWebhook);

/**
 * @route   POST /webhooks/payment/:provider
 * @desc    استقبال تأكيدات الدفع من مزودي الخدمة (للمستقبل)
 * @access  Public
 */
router.post('/payment/:provider', handlePaymentWebhook);

module.exports = router;