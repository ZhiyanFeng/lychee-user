import { apiService } from './api.service';
import { API_ENDPOINTS } from '../constants';

/**
 * Backend-side user data (the `users` table: name, phone, avatar, marketplace
 * rating/move-count aggregates) — there's no separate "profile" table, this
 * *is* the users row. Distinct from authentication, which is handled
 * entirely by Firebase via `AuthContext`/`useAuth()` — this service only
 * talks to endpoints Firebase has no knowledge of.
 */
export class UserService {
  async getUser(): Promise<unknown> {
    return apiService.get<unknown>(API_ENDPOINTS.PROFILE);
  }

  // Creates the `users` row for a Firebase-authenticated person who doesn't
  // have one yet (GET /user/profile returned 404). The backend should derive
  // `firebase_uid` from the verified ID token, not the body.
  async createUser(data: Record<string, unknown>): Promise<unknown> {
    return apiService.post<unknown>(API_ENDPOINTS.CREATE_PROFILE, data);
  }

  async updateUser(data: Record<string, unknown>): Promise<unknown> {
    return apiService.put<unknown>(API_ENDPOINTS.UPDATE_PROFILE, data);
  }
}

export const userService = new UserService();

