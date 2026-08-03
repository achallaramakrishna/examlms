import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { signAccessToken, signRefreshToken } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const SALT_ROUNDS = 10;

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, fullName } = req.body as {
      email: string;
      password: string;
      fullName: string;
    };

    const userRepo = AppDataSource.getRepository(User);
    const existing = await userRepo.findOneBy({ email });
    if (existing) {
      throw new ApiError(409, 'An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await userRepo.save(userRepo.create({ email, passwordHash, fullName }));

    await AppDataSource.getRepository(StudentProfile).save(
      AppDataSource.getRepository(StudentProfile).create({ userId: user.id, strengths: [], weaknesses: [] })
    );

    res.status(201).json({
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user),
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const user = await AppDataSource.getRepository(User).findOneBy({ email });
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new ApiError(401, 'Invalid email or password');
    }

    res.json({
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user),
    });
  } catch (err) {
    next(err);
  }
}

/** Called after passport's Google strategy has attached req.user */
export function googleCallback(req: Request, res: Response) {
  const user = req.user as User;
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  res.redirect(`${process.env.CORS_ORIGIN}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
}
