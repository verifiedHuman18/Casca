import type { Request, Response } from 'express';
import { currentUser } from '../middleware/requireAuth';
import type { AuthService } from '../services/AuthService';
import { changePasswordSchema, loginSchema, signUpSchema } from '../validation/authSchemas';

/** Parses the request, calls AuthService, shapes the response. No business rules here. */
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  signUp = async (req: Request, res: Response): Promise<void> => {
    const input = signUpSchema.parse(req.body);
    res.status(201).json(await this.auth.signUp(input));
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const { enrollmentNo, email, password } = loginSchema.parse(req.body);
    const input = email ? { email, password } : { enrollmentNo: enrollmentNo as string, password };
    res.status(200).json(await this.auth.login(input));
  };

  /** Tokens are stateless: the client discards its token. */
  logout = (_req: Request, res: Response): void => {
    res.status(204).end();
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    await this.auth.changePassword(currentUser(req), currentPassword, newPassword);
    res.status(204).end();
  };
}
