import { useCallback, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { presignUpload, uploadToS3 } from '../api/media';

export type RfqPhotoStatus = 'uploading' | 'uploaded' | 'error';

export interface RfqPhotoItem {
  id: string;
  localUri: string;
  fileName: string;
  fileType: string;
  status: RfqPhotoStatus;
  s3ObjectKey?: string;
  errorMessage?: string;
}

/** Max simultaneous `presignUpload` + `uploadToS3` pairs in flight. */
const MAX_CONCURRENT_UPLOADS = 3;

let idCounter = 0;
function generatePhotoId(): string {
  idCounter += 1;
  return `photo-${Date.now()}-${idCounter}`;
}

/** Best-effort filename when the picker doesn't supply one (common on Android gallery picks). */
function inferFileName(uri: string, mimeType?: string): string {
  const lastSegment = uri.split('/').pop();
  if (lastSegment && lastSegment.includes('.')) return lastSegment;
  const ext = mimeType?.split('/')[1] ?? 'jpg';
  return `photo-${Date.now()}.${ext}`;
}

function inferFileType(mimeType: string | undefined, fileName: string): string {
  if (mimeType) return mimeType;
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return 'image/jpeg';
}

/**
 * Drives Step 2 of `SmallMovingWizardScreen` — the "Stitch-at-the-End"
 * photo upload pattern. Photos are uploaded to S3 as soon as they're
 * picked (not deferred to final submit); only their resulting
 * `s3ObjectKey`s are stitched into the `RfqRequest` payload on Step 3's
 * submit.
 *
 * Immutable per-photo metadata (`localUri`/`fileName`/`fileType`) lives in
 * a ref map, separate from the `photos` state array — that's what each
 * upload reads from, so the concurrency-limited queue never closes over a
 * stale `photos` snapshot the way reading from state inside an async
 * callback would.
 *
 * @param initialPhotos Rehydrates both `photos` state and the metadata ref
 * from a previously-persisted draft (see `smallMovingRequestSlice`) — e.g.
 * after the wizard remounts on returning from the profile-creation detour.
 * Without this, a photo mid-upload/errored when the user navigated away
 * would silently vanish, and "Retry" on a restored errored photo wouldn't
 * have the `localUri` it needs to re-upload.
 */
export function useRfqPhotoUpload(initialPhotos: RfqPhotoItem[] = []) {
  const [photos, setPhotos] = useState<RfqPhotoItem[]>(initialPhotos);
  const metaRef = useRef<Map<string, { localUri: string; fileName: string; fileType: string }>>(
    new Map(initialPhotos.map((p) => [p.id, { localUri: p.localUri, fileName: p.fileName, fileType: p.fileType }]))
  );
  const activeCountRef = useRef(0);
  const queueRef = useRef<string[]>([]);

  const runUpload = useCallback(async (id: string) => {
    const meta = metaRef.current.get(id);
    if (!meta) return;

    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'uploading', errorMessage: undefined } : p))
    );

    try {
      const { presignedUrl, s3ObjectKey } = await presignUpload(meta.fileName, meta.fileType);
      await uploadToS3(presignedUrl, meta.localUri, meta.fileType);
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: 'uploaded', s3ObjectKey, errorMessage: undefined } : p
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Couldn't upload photo, try again";
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'error', errorMessage: message } : p))
      );
    }
  }, []);

  const pump = useCallback(() => {
    while (activeCountRef.current < MAX_CONCURRENT_UPLOADS && queueRef.current.length > 0) {
      const id = queueRef.current.shift();
      if (!id) break;
      activeCountRef.current += 1;
      runUpload(id).finally(() => {
        activeCountRef.current -= 1;
        pump();
      });
    }
  }, [runUpload]);

  const enqueue = useCallback(
    (id: string) => {
      queueRef.current.push(id);
      pump();
    },
    [pump]
  );

  const addAssets = useCallback(
    (assets: ImagePicker.ImagePickerAsset[]) => {
      const newItems: RfqPhotoItem[] = assets.map((asset) => {
        const fileName = asset.fileName || inferFileName(asset.uri, asset.mimeType ?? undefined);
        const fileType = inferFileType(asset.mimeType ?? undefined, fileName);
        const id = generatePhotoId();
        metaRef.current.set(id, { localUri: asset.uri, fileName, fileType });
        return { id, localUri: asset.uri, fileName, fileType, status: 'uploading' };
      });
      setPhotos((prev) => [...prev, ...newItems]);
      newItems.forEach((item) => enqueue(item.id));
    },
    [enqueue]
  );

  /** Opens the photo library, allowing multiple selection. */
  const pickFromLibrary = useCallback(async (): Promise<{ error?: string }> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return { error: 'Photo library access is required to add photos.' };
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      addAssets(result.assets);
    }
    return {};
  }, [addAssets]);

  /** Opens the camera for a single photo. */
  const takePhoto = useCallback(async (): Promise<{ error?: string }> => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return { error: 'Camera access is required to take a photo.' };
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      addAssets(result.assets);
    }
    return {};
  }, [addAssets]);

  /** Re-runs `presignUpload` + `uploadToS3` for one photo without touching any other. */
  const retryPhoto = useCallback(
    (id: string) => {
      enqueue(id);
    },
    [enqueue]
  );

  /** Drops a photo from local state — no backend delete call; S3 lifecycle rules clean up orphans. */
  const removePhoto = useCallback((id: string) => {
    metaRef.current.delete(id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  /** Moves a photo earlier/later in the array so order matches the desired `displayOrder`. */
  const movePhoto = useCallback((id: string, direction: 'up' | 'down') => {
    setPhotos((prev) => {
      const index = prev.findIndex((p) => p.id === id);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }, []);

  const isUploading = photos.some((p) => p.status === 'uploading');
  const s3ObjectKeys = photos
    .filter((p) => p.status === 'uploaded' && p.s3ObjectKey)
    .map((p) => p.s3ObjectKey as string);

  return {
    photos,
    isUploading,
    s3ObjectKeys,
    pickFromLibrary,
    takePhoto,
    retryPhoto,
    removePhoto,
    movePhoto,
  };
}
