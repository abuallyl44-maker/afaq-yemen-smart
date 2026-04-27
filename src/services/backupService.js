/**
 * خدمة النسخ الاحتياطي التلقائي
 */

const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const { promisify } = require('util');
const execPromise = promisify(exec);

/**
 * إنشاء نسخة احتياطية كاملة
 */
async function createBackup() {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(process.env.BACKUPS_PATH, `backup-${timestamp}`);
        await fs.ensureDir(backupDir);

        // 1. نسخ قاعدة البيانات
        console.log('Backing up database...');
        const dbBackupFile = path.join(backupDir, 'database.sql');
        await execPromise(
            `PGPASSWORD=${process.env.DB_PASSWORD} pg_dump -h ${process.env.DB_HOST} -U ${process.env.DB_USER} ${process.env.DB_NAME} > ${dbBackupFile}`
        );

        // 2. نسخ الملفات المرفوعة
        console.log('Backing up uploads...');
        const uploadsDir = path.join(backupDir, 'uploads');
        await fs.copy(process.env.UPLOADS_PATH, uploadsDir);

        // 3. نسخ مواقع العملاء
        console.log('Backing up client sites...');
        const sitesDir = path.join(backupDir, 'sites');
        await fs.copy(process.env.SITES_PATH, sitesDir);

        // 4. ضغط النسخة الاحتياطية
        console.log('Compressing backup...');
        const zipFile = path.join(process.env.BACKUPS_PATH, `backup-${timestamp}.zip`);
        
        await new Promise((resolve, reject) => {
            const output = fs.createWriteStream(zipFile);
            const archive = archiver('zip', { zlib: { level: 9 } });
            
            output.on('close', resolve);
            archive.on('error', reject);
            
            archive.pipe(output);
            archive.directory(backupDir, false);
            archive.finalize();
        });

        // 5. حذف المجلد المؤقت
        await fs.remove(backupDir);
        
        // 6. حذف النسخ القديمة (الاحتفاظ بآخر 7 أيام فقط)
        console.log('Cleaning old backups...');
        const files = await fs.readdir(process.env.BACKUPS_PATH);
        const backupFiles = files.filter(f => f.startsWith('backup-') && f.endsWith('.zip'));
        
        // ترتيب حسب التاريخ
        backupFiles.sort().reverse();
        
        // الاحتفاظ بآخر 7 نسخ
        const toDelete = backupFiles.slice(7);
        for (const file of toDelete) {
            await fs.remove(path.join(process.env.BACKUPS_PATH, file));
        }

        console.log(`Backup completed: ${zipFile}`);
        return zipFile;
    } catch (error) {
        console.error('Backup failed:', error);
        return null;
    }
}

/**
 * استعادة نسخة احتياطية
 */
async function restoreBackup(backupFile) {
    try {
        const extractDir = path.join(process.env.BACKUPS_PATH, 'restore-temp');
        await fs.ensureDir(extractDir);
        
        // فك الضغط
        const extract = require('extract-zip');
        await extract(backupFile, { dir: extractDir });
        
        // استعادة قاعدة البيانات
        const dbFile = path.join(extractDir, 'database.sql');
        if (await fs.pathExists(dbFile)) {
            await execPromise(
                `PGPASSWORD=${process.env.DB_PASSWORD} psql -h ${process.env.DB_HOST} -U ${process.env.DB_USER} ${process.env.DB_NAME} < ${dbFile}`
            );
        }
        
        // استعادة الملفات
        const uploadsBackup = path.join(extractDir, 'uploads');
        if (await fs.pathExists(uploadsBackup)) {
            await fs.copy(uploadsBackup, process.env.UPLOADS_PATH);
        }
        
        const sitesBackup = path.join(extractDir, 'sites');
        if (await fs.pathExists(sitesBackup)) {
            await fs.copy(sitesBackup, process.env.SITES_PATH);
        }
        
        // تنظيف
        await fs.remove(extractDir);
        
        console.log(`Restored from backup: ${backupFile}`);
        return true;
    } catch (error) {
        console.error('Restore failed:', error);
        return false;
    }
}

/**
 * إعداد خدمة النسخ الاحتياطي
 */
function setupBackupService() {
    // إنشاء المجلدات إذا لم تكن موجودة
    fs.ensureDirSync(process.env.BACKUPS_PATH);
    fs.ensureDirSync(process.env.UPLOADS_PATH);
    fs.ensureDirSync(process.env.SITES_PATH);
    fs.ensureDirSync(process.env.LOGS_PATH);
    
    console.log('Backup service initialized');
}

module.exports = {
    createBackup,
    restoreBackup,
    setupBackupService
};