import fs from 'node:fs';
import path from 'node:path';
import type { Database } from 'better-sqlite3';

const BACKUP_DIR = path.resolve('backups');
const MAX_BACKUPS = 10;

export function initBackupService() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log('📁 Carpeta de respaldos creada:', BACKUP_DIR);
  }
}

export async function performBackup(db: Database) {
  try {
    initBackupService();

    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, 19);
    
    const backupPath = path.join(BACKUP_DIR, `forgeflow_backup_${timestamp}.db`);

    // SQLite native backup is safe while DB is open
    await db.backup(backupPath);
    
    console.log(`✅ Respaldo automático completado: ${path.basename(backupPath)}`);

    // Manage rotation: keep only latest MAX_BACKUPS
    rotateBackups();
    
    return {
      success: true,
      timestamp: now.toISOString(),
      path: backupPath
    };
  } catch (error) {
    console.error('❌ Error en el respaldo automático:', error);
    return { success: false, error };
  }
}

function rotateBackups() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('forgeflow_backup_') && f.endsWith('.db'))
    .map(f => ({
      name: f,
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time); // Newest first

  if (files.length > MAX_BACKUPS) {
    const toDelete = files.slice(MAX_BACKUPS);
    toDelete.forEach(f => {
      fs.unlinkSync(path.join(BACKUP_DIR, f.name));
      console.log(`🗑️ Historial purgado: ${f.name} (exceso de capacidad)`);
    });
  }
}
