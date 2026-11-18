import { apiService } from '../services';
import { API_ENDPOINTS } from '../constants';
import type { ApiResponse } from '../types';
import { extractErrorMessage } from './http';

export interface PresignUploadResult {
  presignedUrl: string;
  s3ObjectKey: string;
}

/**
 * Step 1 of the "Stitch-at-the-End" upload pattern: asks the backend for a
 * short-lived (10 min) S3 presigned PUT URL for one photo. Goes through
 * `apiService` (so the Firebase ID token is attached automatically, like
 * every other authenticated call), unlike `uploadToS3` below, which must
 * NOT use `apiService` — the presigned URL is itself the auth, and S3
 * rejects requests carrying an unexpected `Authorization` header.
 *
 * `useRfqPhotoUpload` sets a photo's status to `'error'` with
 * `"Couldn't prepare photo upload, try again"` if this throws — see that
 * hook for the retry flow.
 */
export async function presignUpload(
  fileName: string,
  fileType: string
): Promise<PresignUploadResult> {
  try {
    const response = await apiService.post<ApiResponse<PresignUploadResult>>(
      API_ENDPOINTS.MEDIA_PRESIGN,
      { fileName, fileType }
    );
    if (!response?.success || !response.data?.presignedUrl || !response.data?.s3ObjectKey) {
      throw new Error(response?.message || "Couldn't prepare photo upload, try again");
    }
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Couldn't prepare photo upload, try again"));
  }
}

/**
 * Step 2: uploads the local photo's raw bytes directly to S3 via the
 * presigned URL from `presignUpload`. Deliberately a bare `fetch` (not
 * `apiService`) with:
 *   - `Content-Type` set to the EXACT same `fileType` string sent to
 *     `/media/presign` — S3 validates this against the signed policy and
 *     returns 403 on any mismatch.
 *   - No `Authorization` header at all — the presigned query-string
 *     signature on `presignedUrl` *is* the auth for this request.
 *   - Raw binary body (`fetch(fileUri).blob()`), never
 *     `multipart/form-data` — S3 presigned PUT URLs expect the file bytes
 *     as the entire body.
 *
 * Can fail from either a stale/expired URL (>10 min since `presignUpload`)
 * or a dropped connection — `useRfqPhotoUpload` lets the user re-run the
 * whole `presignUpload` + `uploadToS3` pair for that one photo without
 * affecting any other photo or blocking wizard navigation.
 */
export async function uploadToS3(
  presignedUrl: string,
  fileUri: string,
  fileType: string
): Promise<void> {
  const fileResponse = await fetch(fileUri);
  const fileBlob = await fileResponse.blob();

  const putResponse = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': fileType,
    },
    body: fileBlob,
  });

  if (!putResponse.ok) {
    throw new Error(
      `Photo upload failed (status ${putResponse.status}). The link may have expired — please retry.`
    );
  }
}
