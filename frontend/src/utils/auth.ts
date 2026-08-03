export interface StoredUser {
  id?: string;
  fullName?: string;
  email?: string;
  role?: 'student' | 'admin';
}

export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAdmin(): boolean {
  return getStoredUser()?.role === 'admin';
}
