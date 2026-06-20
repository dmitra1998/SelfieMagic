## Database Migration Strategy

Each phone has its own SQLite database. The backend handles data shared between users. The app uses `PRAGMA user_version` to track the database version. When the schema changes, the app runs migrations in order during startup. Each schema migration runs inside a transaction. If it fails, SQLite rolls back the whole change and keeps the old database working.

For example, this is how we would add `gps_accuracy` to a database with 50,000 video rows:

1. We will add a nullable column without a default value:

   ```sql
   ALTER TABLE videos ADD COLUMN gps_accuracy REAL;
   ```

2. Existing rows will contain `NULL`. This means GPS accuracy was not recorded or has not been copied yet. Adding the column this way avoids rewriting all 50,000 rows during startup.

3. We can update the recording code so every new video saves `gps_accuracy`.

4. We will copy old GPS accuracy values from `metadata_json` in batches of 500:

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

5. We can run each batch in a short transaction. Pause between batches so recording and uploading stay responsive. Save the progress in a migration-state table so the work can continue after the app or phone restarts.

6. We will add an index only if the app searches or sorts by `gps_accuracy`. Otherwise, the index would use storage and make writes slower without helping any query.

We will test every migration with a new database and copies of databases from older app versions. One test database will contain 50,000 video rows.

The tests will check the schema version, row count, saved metadata, restart recovery, and rollback behavior.

For a destructive change, we will first add the new table or column. We will copy the data in small batches, update the app to use the new structure, and remove the old structure in a later release.

## Query Optimization

The video list uses keyset pagination instead of `OFFSET`. After loading the first page, the app uses the last video's `started_at` and `video_id` values to load the next page:

```sql
SELECT video_id, worker_id, started_at, duration_ms, file_size_bytes,
       fps, fps_tier, upload_state
FROM videos
WHERE worker_id = ?
  AND (started_at < ? OR (started_at = ? AND video_id < ?))
ORDER BY started_at DESC, video_id DESC
LIMIT ?;
```

This query is supported by the following index:

```sql
CREATE INDEX idx_videos_worker_started
ON videos(worker_id, started_at DESC, video_id DESC);
```

This index first finds videos for one worker and then reads them in the correct order. `video_id` gives a stable order when two videos have the same start time. With `OFFSET`, SQLite must read and skip all earlier rows before returning a later page. Keyset pagination starts from the last loaded video, so later pages stay fast as the table grows. It also reduces skipped or repeated results when a new video is added while the list is open.

The upload worker uses a second partial index:

```sql
CREATE INDEX idx_videos_upload_queue
ON videos(upload_state, last_attempted_at, started_at)
WHERE upload_state IN ('pending', 'failed');
```

This partial index contains only videos that still need upload work. It stays smaller than an index over every video and helps the app quickly find pending or failed uploads in retry order. Already uploaded videos do not need to be scanned.

