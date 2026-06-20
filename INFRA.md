# AWS Infrastructure Design

## Overview

For this assignment, I used the following upload flow:

```text
Android app
  -> requests a presigned URL from the upload API
  -> uploads the video directly to S3
  -> asks the upload API to confirm the object
  -> marks the local SQLite row as uploaded
```

The app never receives AWS credentials. The backend creates a short-lived URL for one video, and the app uses that URL to upload directly to a private S3 bucket.

The Terraform files for this design are in `infra/terraform/`.

## Q1: S3 Bucket Design

I would use one private bucket for each environment:

```text
selfie-magic-video-dev
selfie-magic-video-staging
selfie-magic-video-production
```

I would not create a bucket for every worker. S3 can handle a very large number of objects in one bucket, and one bucket per environment is easier to secure, monitor, and manage. Separate buckets also stop development code from accidentally accessing production videos.

I use this object key format:

```text
workers/{hashed_worker_id}/videos/{video_id}.mp4
```

Example:

```text
workers/32b110655156775fb63ba364813a6b86/videos/10d554b1-666c-428f-8481-85399e564db7.mp4
```

The `video_id` is a UUID v4. It is also the idempotency key, so every retry for the same video uses the same S3 key. I hash the worker ID because the real value may be an email address or phone number, which should not appear in an S3 path.

I keep timestamps and other searchable metadata in the database. I do not depend on parsing S3 keys when listing or filtering videos.

## Q2: IAM and Security

I would keep the bucket private and apply these controls:

- Enable S3 Block Public Access.
- Use bucket-owner-enforced object ownership so ACLs cannot make an object public.
- Use default SSE-S3 encryption for stored videos.
- Deny non-TLS requests with a bucket policy.
- Enable versioning to protect against accidental overwrites.
- Move old object versions to Standard-IA after seven days and delete them after 37 days.
- Use HTTPS for the production API.

The upload API only needs these S3 permissions:

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

`PutObject` is required to create the upload URL. `GetObject` is required because S3 uses that permission for `HeadObject`. `ListBucket` lets the backend tell the difference between a missing object and an access-denied response. The role cannot delete videos or access another bucket.

In production, the backend would get `worker_id` from a verified login token. It would then build the S3 key itself. The client would not be allowed to choose another worker's path.

The Node server in this repository is a mock backend, so it currently accepts `workerId` from the request. I would replace that part when connecting real authentication. The key generation and IAM design already show how the production version would be scoped.

I chose a 15-minute expiry for presigned URLs. A 50 MB video should normally finish within that time, including on a slower mobile connection. If an upload fails, the app requests a new URL instead of reusing an expired one.

## Q3: Storage Cost Strategy

The assignment gives these numbers:

```text
10,000 workers x 20 videos/day = 200,000 videos/day
200,000 videos x 50 MB = 10 TB/day
10 TB x 30 days = 300 TB/month
10 TB x 90 days = 900 TB stored after 90 days
```

For a simple estimate, I used a blended S3 Standard price of about USD 0.022 per GB-month:

```text
900,000 GB x USD 0.022 = about USD 19,800/month
```

This is an approximate storage run rate at day 90 before lifecycle savings. The estimate was prepared in June 2026. Actual pricing in `eu-north-1` is tiered and may be different, so I would confirm the final amount with the AWS Pricing Calculator.

This estimate does not include retrieval charges, taxes, API Gateway, backend compute, monitoring, or data transfer. The system would also make about six million PUT requests each month, but storage would still be the main cost.

I would use this lifecycle policy:

- Keep videos in S3 Standard for the first 30 days while processing and checks are most likely.
- Move videos to Standard-IA after 30 days.
- Move videos to Glacier Instant Retrieval after 90 days.
- Move videos to Deep Archive after one year.
- Delete videos after the agreed retention period, which is two years in the Terraform example.
- Abort incomplete multipart uploads after seven days.

I would not use Intelligent-Tiering by default because this access pattern is fairly predictable: videos are used soon after upload and become colder over time. Fixed lifecycle rules avoid the per-object monitoring charge. If real usage turns out to be unpredictable, Intelligent-Tiering would be a reasonable alternative.

## Q4: Upload Confirmation

For the current implementation, I confirm uploads using `HeadObject`:

1. The app completes the presigned PUT and receives an ETag.
2. The app sends the object key, ETag, expected file size, and `video_id` to the backend.
3. The backend calls `HeadObject`.
4. It checks the exact object key, content length, and ETag.
5. The app only changes the SQLite row to `uploaded` after the backend confirms the object.

I chose this because it gives the app an immediate result and is simple enough for the assignment backend.

At a larger scale, I would also send S3 events to SQS and process them with Lambda or a worker. That gives the backend its own record that S3 accepted the object. The consumer must be idempotent because S3 event delivery can happen more than once. I would also configure a dead-letter queue for events that repeatedly fail.

## Q5: Presigned URL Generator

The working implementation is in `backend/server.mjs`.

- `POST /uploads/presign` validates the UUID and creates a 15-minute PUT URL.
- The backend generates the object key from the worker namespace and `video_id`.
- It checks whether the object already exists before creating another upload URL.
- `POST /uploads/confirm` checks the uploaded object before the app marks it as uploaded.

For local testing, the backend reads AWS credentials from `backend/.env`. In production, I would deploy it with an ECS task role, Lambda execution role, or another workload identity. I would not store long-lived AWS access keys on a production server.

## Terraform State

The example works with local Terraform state so it is easy to review. For a team deployment, I would use an encrypted remote backend with state locking and versioning. Access to the state would be limited because Terraform state can contain infrastructure details.

I would create the remote-state resources in a small bootstrap stack instead of making this stack depend on the bucket it is currently creating.

## Running Terraform

For a new test bucket:

```sh
cd infra/terraform
terraform init
terraform fmt -check
terraform validate
terraform plan -var="bucket_name=YOUR_GLOBALLY_UNIQUE_BUCKET_NAME"
terraform apply -var="bucket_name=YOUR_GLOBALLY_UNIQUE_BUCKET_NAME"
```

I would test this with a separate empty bucket before touching the existing bucket.

To manage the existing `selfiemagicvideos` bucket, I would first back it up and import it into Terraform state:

```sh
terraform import -var="bucket_name=selfiemagicvideos" aws_s3_bucket.videos selfiemagicvideos
terraform plan -var="bucket_name=selfiemagicvideos"
```

I would review the plan carefully before applying it because Terraform will add or change encryption, public access, ownership, versioning, lifecycle, bucket policy, and IAM settings.
