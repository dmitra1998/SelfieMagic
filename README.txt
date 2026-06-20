## Database Migration Strategy

The SQLite database uses `PRAGMA user_version` to track its schema version. 
Each application release includes ordered, forward-only migrations. 
Migrations run inside an exclusive transaction during application startup, before database-dependent features become available.

For example, to add `gps_accuracy` to a table containing 50,000 videos:

1. Add the nullable column without a default:

   ```sql
   ALTER TABLE videos ADD COLUMN gps_accuracy REAL;

2. Release the schema immediately without rewriting all existing rows. Existing records remain valid with NULL, meaning accuracy was not captured.

3. New recordings populate gps_accuracy during insertion.

4. If historical values exist inside metadata_json, backfill them gradually in small batches rather than blocking startup:

    UPDATE videos
    SET gps_accuracy = json_extract(metadata_json, '$.gps_at_start.accuracy')
    WHERE video_id IN (
    SELECT video_id
    FROM videos
    WHERE gps_accuracy IS NULL
    LIMIT 500
    );

5. Persist backfill progress so it can safely resume after an app restart.

6. Create any required index only after the backfill and only if application queries filter or sort by gps_accuracy.