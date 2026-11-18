
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * Standard wrapper the backend uses for the media-presign and RFQ-create
 * endpoints (and, per the backend team, going forward for new endpoints
 * generally): `data` is only meaningful when `success` is true, in which
 * case `message` is just a human-readable confirmation ("Success").
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Backend's `AdditionalServiceType` enum (string values, case-sensitive) —
 * shared by RFQ create/update requests and responses on
 * `POST/PUT /api/v1/rfqs` and `GET /api/v1/rfqs/**`.
 */
export type AdditionalServiceType =
  | 'FURNITURE_DISASSEMBLY'
  | 'PACKING_HELP'
  | 'MOVING_BLANKETS'
  | 'BOXES_SUPPLIES';
