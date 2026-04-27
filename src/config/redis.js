/**
 * إعدادات اتصال Redis
 */

const Redis = require('ioredis');

let redisClient = null;

/**
 * إنشاء اتصال Redis
 */
function getRedisClient() {
    if (!redisClient) {
        redisClient = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            maxRetriesPerRequest: 3
        });

        redisClient.on('connect', () => {
            console.log('✅ Redis connected successfully');
        });

        redisClient.on('error', (error) => {
            console.error('❌ Redis connection error:', error);
        });
    }
    return redisClient;
}

/**
 * تخزين بيانات في Redis مع انتهاء صلاحية
 * @param {string} key - المفتاح
 * @param {any} value - القيمة
 * @param {number} ttl - مدة الصلاحية بالثواني (اختياري)
 */
async function setCache(key, value, ttl = 3600) {
    try {
        const client = getRedisClient();
        const serialized = JSON.stringify(value);
        if (ttl > 0) {
            await client.setex(key, ttl, serialized);
        } else {
            await client.set(key, serialized);
        }
        return true;
    } catch (error) {
        console.error('Redis set error:', error);
        return false;
    }
}

/**
 * استرجاع بيانات من Redis
 * @param {string} key - المفتاح
 */
async function getCache(key) {
    try {
        const client = getRedisClient();
        const data = await client.get(key);
        if (data) {
            return JSON.parse(data);
        }
        return null;
    } catch (error) {
        console.error('Redis get error:', error);
        return null;
    }
}

/**
 * حذف بيانات من Redis
 * @param {string} key - المفتاح
 */
async function deleteCache(key) {
    try {
        const client = getRedisClient();
        await client.del(key);
        return true;
    } catch (error) {
        console.error('Redis delete error:', error);
        return false;
    }
}

/**
 * حذف جميع البيانات التي تبدأ بمفتاح معين
 * @param {string} pattern - النمط
 */
async function deleteCacheByPattern(pattern) {
    try {
        const client = getRedisClient();
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(...keys);
        }
        return true;
    } catch (error) {
        console.error('Redis delete by pattern error:', error);
        return false;
    }
}

/**
 * إغلاق اتصال Redis
 */
async function closeRedis() {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
    }
}

module.exports = {
    getRedisClient,
    setCache,
    getCache,
    deleteCache,
    deleteCacheByPattern,
    closeRedis
};