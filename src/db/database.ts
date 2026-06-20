import * as SQLite from "expo-sqlite";

const DATABASE_NAME = "selfie-magic.db";
const DATABASE_VERSION = 1;

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function migrateDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

  const versionRow = await database.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion > DATABASE_VERSION) {
    throw new Error(`Database version ${currentVersion} is newer than supported version ${DATABASE_VERSION}.`);
  }

  if (currentVersion === 0) {
    await database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(`
        CREATE TABLE workers (
          worker_id TEXT PRIMARY KEY NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE videos (
          video_id TEXT PRIMARY KEY NOT NULL,
          worker_id TEXT NOT NULL,
          started_at TEXT NOT NULL,
          ended_at TEXT NOT NULL,
          duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0),
          file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes >= 0),
          fps REAL NOT NULL CHECK (fps > 0),
          fps_tier TEXT NOT NULL CHECK (fps_tier IN ('low', 'standard', 'high')),
          device_model TEXT NOT NULL,
          os_version TEXT NOT NULL,
          resolution TEXT NOT NULL,
          local_path TEXT NOT NULL UNIQUE,
          metadata_json TEXT NOT NULL,
          upload_state TEXT NOT NULL DEFAULT 'pending'
            CHECK (upload_state IN ('pending', 'uploading', 'uploaded', 'failed')),
          attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
          last_error TEXT,
          last_attempted_at TEXT,
          network_type_at_upload TEXT
            CHECK (network_type_at_upload IS NULL OR network_type_at_upload IN ('wifi', 'cellular', 'none', 'unknown')),
          uploaded_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON UPDATE CASCADE ON DELETE RESTRICT
        );

        CREATE INDEX idx_videos_worker_started
          ON videos(worker_id, started_at DESC, video_id DESC);

        CREATE INDEX idx_videos_upload_queue
          ON videos(upload_state, last_attempted_at, started_at)
          WHERE upload_state IN ('pending', 'failed');

        PRAGMA user_version = 1;
      `);
    });
  }
}

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME).then(async (database) => {
      await migrateDatabase(database);
      return database;
    });
  }

  return databasePromise;
}

export async function initializeDatabase(): Promise<void> {
  await getDatabase();
}
