const fs = require('fs-extra');
const path = require('path');
const morgan = require('morgan');

// إنشاء مجلد السجلات إذا لم يكن موجوداً
const logsDir = path.join(__dirname, '../../logs');
fs.ensureDirSync(logsDir);

// إنشاء تدفقات الكتابة
const accessLogStream = fs.createWriteStream(
    path.join(logsDir, 'access.log'),
    { flags: 'a' }
);

const errorLogStream = fs.createWriteStream(
    path.join(logsDir, 'error.log'),
    { flags: 'a' }
);

// تنسيق Morgan للـ access log
const accessLogger = morgan('combined', { stream: accessLogStream });

// تنسيق Morgan للـ error log
const errorLogger = morgan('combined', {
    stream: errorLogStream,
    skip: (req, res) => res.statusCode < 400
});

// سجل مخصص للتطبيق
const logInfo = (message, data = null) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message,
        data
    };
    console.log(JSON.stringify(logEntry));
    
    // كتابة إلى ملف info.log
    fs.appendFileSync(
        path.join(logsDir, 'info.log'),
        JSON.stringify(logEntry) + '\n'
    );
};

const logError = (message, error = null) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        message,
        error: error ? { message: error.message, stack: error.stack } : null
    };
    console.error(JSON.stringify(logEntry));
    
    // كتابة إلى ملف error.log
    fs.appendFileSync(
        path.join(logsDir, 'error.log'),
        JSON.stringify(logEntry) + '\n'
    );
};

const logWarning = (message, data = null) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'WARNING',
        message,
        data
    };
    console.warn(JSON.stringify(logEntry));
    
    fs.appendFileSync(
        path.join(logsDir, 'warnings.log'),
        JSON.stringify(logEntry) + '\n'
    );
};

module.exports = {
    accessLogger,
    errorLogger,
    logInfo,
    logError,
    logWarning
};