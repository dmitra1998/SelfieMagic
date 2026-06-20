## Database Migration Strategy

The SQLite database is local to each device; user-scale data is handled by the backend. The app uses `PRAGMA user_version` to track the local schema version. Each release contains ordered, forward-only migrations that run before database-dependent features become available. Schema changes run in an exclusive transaction so a failure rolls back the migration instead of leaving a partially upgraded database.

To add `gps_accuracy` to a device database containing 50,000 video rows:

1. We will add the nullable column without a default:

   ```sql
   ALTER TABLE videos ADD COLUMN gps_accuracy REAL;
   ```

2. We can complete the schema migration without rewriting all existing rows. Existing records remain valid with `NULL`, meaning GPS accuracy was not captured or has not yet been backfilled.

3. We will update the recording insert path so all new rows populate `gps_accuracy`.

4. If we have historical values in `metadata_json`, we can backfill them in batches of 500 rather than blocking startup:

   ```sql
   UPDATE videos
   SET gps_accuracy = json_extract(metadata_json, '$.gps_at_start.accuracy')
   WHERE video_id IN (
      SELECT video_id
      FROM videos
      WHERE gps_accuracy IS NULL
      LIMIT 500
   );
   ```

5. We can run each batch in its own short transaction and yield between batches so recording and upload operations remain responsive. We can persist backfill progress in a migration-state table so work can safely resume after an app termination or device restart.

6. We can add an index only if production queries filter or sort by `gps_accuracy`; otherwise, avoid the storage and write overhead.

We will test every migration against a new database and copies of databases from supported older app versions, including a representative 50,000-row fixture. 

We will verify schema versions, row counts, preserved metadata, restart recovery, and rollback behavior. 

Destructive changes use an expand-and-contract approach: we will add the replacement structure first, migrate data incrementally, switch application reads and writes, and remove obsolete structures in a later release.
