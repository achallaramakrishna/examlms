// Augments Express.User (declared as an empty interface by @types/passport,
// intentionally left for apps to fill in) so req.user is typed consistently
// everywhere — both in the JWT auth middleware and wherever passport sets it.
import { UserRole } from '../models/User';

export {};

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: UserRole;
    }
  }
}
