# AWS Infrastructure Notes

## Overview

The app uploads videos with this flow:

```text
Android app
  -> asks the upload API for a short-lived URL
  -> uploads the video straight to S3
  -> asks the API to check the uploaded file
  -> marks the local SQLite row as uploaded
```

The phone never receives AWS credentials. The backend creates a URL for one video, and the phone uses it to upload to a private S3 bucket.

The Terraform files are in `infra/terraform/`.

## S3 bucket design

I would use one private bucket for each environment:

```text
selfie-magic-video-dev
selfie-magic-video-staging
selfie-magic-video-production
```

I would not create one bucket for each worker. S3 can store a very large number of objects in one bucket. A bucket for each environment is easier to secure, monitor, and manage. It also keeps test videos away from production videos.

Video keys use this format:

```text
workers/{hashed_worker_id}/videos/{video_id}.mp4
```

Example:

```text
workers/32b110655156775fb63ba364813a6b86/videos/10d554b1-666c-428f-8481-85399e564db7.mp4
```

`video_id` is a UUID v4. The app uses the same ID for every retry, so retries use the same S3 key. The worker ID is hashed because the real value may contain an email address or phone number.

Timestamps and searchable video details belong in a database. The app should not have to read or split S3 keys to search for videos.

## IAM and security

The bucket should have these settings:

- Block all public access.
- Use bucket-owner-enforced object ownership so ACLs cannot make a file public.
- Encrypt stored videos with SSE-S3.
- Reject requests that do not use TLS/HTTPS.
- Turn on versioning to protect against accidental replacement.
- Move old versions to Standard-IA after seven days and delete them after 37 days.
- Use HTTPS for the production API.

The upload API only needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::BUCKET_NAME"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::BUCKET_NAME/workers/*"
    }
  ]
}
```

`PutObject` is needed to sign uploads. S3 checks `GetObject` permission when the API uses `HeadObject`. `ListBucket` helps the API tell the difference between a missing object and a permission error. The role cannot delete videos or use another bucket.

In production, the backend should get `worker_id` from a verified login token. It should build the S3 key itself. The app must not be able to choose another worker's path.

The backend in this repository is a sample, so it currently accepts `workerId` from the request. This must be replaced before production use.

The upload URL lasts for 15 minutes. A 50 MB video should normally finish in that time, even on a slower connection. If the upload fails or the URL expires, the app asks for a new one.

## Storage cost

Using the assignment numbers:

```text
10,000 workers x 20 videos each day = 200,000 videos each day
200,000 videos x 50 MB = 10 TB each day
10 TB x 30 days = 300 TB added each month
10 TB x 90 days = 900 TB stored after 90 days
```

For a rough estimate, use an average S3 Standard price of USD 0.022 per GB-month:

```text
900,000 GB x USD 0.022 = about USD 19,800 each month
```

This is only a simple storage estimate at day 90, before lifecycle savings. It was prepared in June 2026. AWS prices vary by region and storage level, so the final number should be checked in the AWS Pricing Calculator.

This estimate does not include downloads, taxes, API Gateway, backend servers, monitoring, or network transfer. The system would also make around six million PUT requests each month. Storage is still likely to be the largest cost.

The suggested lifecycle is:

- Keep videos in S3 Standard for 30 days.
- Move them to Standard-IA after 30 days.
- Move them to Glacier Instant Retrieval after 90 days.
- Move them to Deep Archive after one year.
- Delete them after the agreed retention period. The Terraform example uses two years.
- Remove unfinished multipart uploads after seven days.

I would not use Intelligent-Tiering at first. The expected pattern is simple: videos are used soon after upload and become less useful over time. Fixed lifecycle rules avoid the extra per-object monitoring fee. Intelligent-Tiering may make sense later if real usage is less predictable.

## Upload confirmation

The current backend uses `HeadObject` to check an upload:

1. The phone finishes the S3 PUT and receives an ETag.
2. It sends the object key, ETag, file size, and `video_id` to the backend.
3. The backend calls `HeadObject`.
4. It checks the key, file size, and ETag.
5. The app marks the SQLite row as uploaded only after the backend confirms the object.

This gives the phone an immediate answer and keeps the sample backend small.

For a larger system, S3 should also send events to SQS. A Lambda function or worker can then record uploads without depending only on the phone. S3 may deliver an event more than once, so the worker must safely handle duplicates. Messages that keep failing should move to a dead-letter queue.

## Upload API

The TypeScript API is in `backend/src/server.ts`. It builds to `backend/dist/server.js`.

- `POST /uploads/presign` checks the UUID and creates a 15-minute PUT URL.
- The backend creates the object key from the worker and video IDs.
- It checks for an existing object before it creates another URL.
- `POST /uploads/confirm` checks the uploaded object before the app marks it as uploaded.

For local development, the backend can use AWS credentials from the normal AWS credential chain. In production, it should run with an ECS task role, Lambda execution role, or another short-lived workload identity. Long-lived AWS keys should not be stored on a production server.

## Terraform state

The example uses a local Terraform state file because it is easy to review. A team should use encrypted remote state with locking and versioning. Access to the state must be limited because it can contain private infrastructure details.

The remote-state bucket should be created by a small setup stack. The main stack should not try to store its state inside a bucket that it is still creating.

## Run Terraform

To create a new test bucket:

```powershell
Set-Location infra/terraform
terraform init
terraform fmt -check
terraform validate
terraform plan -var="bucket_name=YOUR_GLOBALLY_UNIQUE_BUCKET_NAME"
terraform apply -var="bucket_name=YOUR_GLOBALLY_UNIQUE_BUCKET_NAME"
```

Use a separate empty bucket for the first test.

To manage an existing `selfiemagicvideos` bucket, back it up first and import it into Terraform state:

```powershell
terraform import -var="bucket_name=selfiemagicvideos" aws_s3_bucket.videos selfiemagicvideos
terraform plan -var="bucket_name=selfiemagicvideos"
```

Read the plan carefully before applying it. Terraform may change encryption, public access, ownership, versioning, lifecycle rules, the bucket policy, and IAM settings.
