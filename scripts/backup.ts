
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BACKUP_DIR = path.join(__dirname, '../backups');
const RETENTION_DAYS = 7;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL is not defined in .env file');
    process.exit(1);
}

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Generate timestamp for filename
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(BACKUP_DIR, `mentis_backup_${timestamp}.sql.gz`);

async function findPgDump(): Promise<string> {
    if (process.platform === 'win32') {
        const commonPaths = [
            'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
            'D:\\PostgreSQL\\17\\bin\\pg_dump.exe',
            'E:\\PostgreSQL\\17\\bin\\pg_dump.exe',
            'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
            'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
            'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
            'D:\\PostgreSQL\\16\\bin\\pg_dump.exe',
            'E:\\PostgreSQL\\16\\bin\\pg_dump.exe',
            'F:\\PostgreSQL\\16\\bin\\pg_dump.exe',
            // Default system command if in PATH
            'pg_dump'
        ];

        for (const p of commonPaths) {
            if (p === 'pg_dump') continue; // We test specific paths first
            if (fs.existsSync(p)) {
                console.log(`✅ Found pg_dump at: ${p}`);
                return p;
            }
        }
    }
    return 'pg_dump';
}

async function backupDatabase() {
    console.log('🚀 Starting database backup...');
    console.log(`📂 Output: ${backupFile}`);

    const pgDumpPath = await findPgDump();
    const writeStream = fs.createWriteStream(backupFile);
    const gzip = zlib.createGzip();

    console.log(`ℹ️ Using pg_dump command: ${pgDumpPath}`);

    try {
        const dumpProcess = spawn(pgDumpPath, [DATABASE_URL as string]);

        // Pipe: pg_dump stdout -> gzip -> file
        dumpProcess.stdout.pipe(gzip).pipe(writeStream);

        // Capture errors
        dumpProcess.stderr.on('data', (data: Buffer) => {
            // pg_dump tends to write non-error info to stderr too, so we just log it
            const msg = data.toString();
            if (!msg.startsWith('--')) { // Ignore comments
                console.log(`ℹ️ pg_dump: ${msg.trim()}`);
            }
        });

        await new Promise<void>((resolve, reject) => {
            writeStream.on('finish', () => resolve());
            dumpProcess.on('error', (err: Error) => reject(new Error(`Failed to spawn pg_dump: ${err.message}`)));
            gzip.on('error', (err: Error) => reject(new Error(`Gzip error: ${err.message}`)));
            dumpProcess.on('close', (code: number | null) => {
                if (code !== 0) {
                    reject(new Error(`pg_dump exited with code ${code}`));
                }
            });
        });

        console.log('✅ Backup created successfully!');
        await rotateBackups();

    } catch (error: unknown) {
        console.error('❌ Backup failed:', error instanceof Error ? error.message : String(error));
        console.error('👉 Tip: Ensure PostgreSQL Command Line Tools are installed.');
        process.exit(1);
    }
}

async function rotateBackups() {
    console.log('🔄 Checking for old backups to rotate...');

    try {
        const files = fs.readdirSync(BACKUP_DIR);
        const now = Date.now();
        const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;

        let deletedCount = 0;

        for (const file of files) {
            const filePath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filePath);

            if (now - stats.mtimeMs > retentionMs) {
                fs.unlinkSync(filePath);
                console.log(`🗑️ Deleted old backup: ${file}`);
                deletedCount++;
            }
        }

        if (deletedCount === 0) {
            console.log('✨ No old backups to delete.');
        } else {

        }

    } catch (error: unknown) {
        console.error('⚠️ Warning: Failed to rotate backups:', error instanceof Error ? error.message : String(error));
    }
}

// Run
backupDatabase();
