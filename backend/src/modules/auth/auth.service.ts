import { prisma } from '../../core/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { LoginDto, RegisterDto, ChangePasswordDto } from './auth.dto.js';

const JWT_SECRET = process.env.JWT_SECRET || 'warteg-system-secret-key-2026-super-secure';

export class AuthService {
  async ensureDefaultUser() {
    const count = await prisma.user.count();
    if (count === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          name: 'Pemilik Warteg',
          role: 'owner',
        },
      });
      console.log('[Auth] Akun default dibuat: username: admin | password: admin123');
    }
  }

  async login(dto: LoginDto) {
    const user = await prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user) {
      throw new Error('Username atau password salah');
    }

    const isValidPassword = await bcrypt.compare(dto.password, user.password);
    if (!isValidPassword) {
      throw new Error('Username atau password salah');
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    };
  }

  async createUserByOwner(dto: RegisterDto) {
    const existing = await prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (existing) {
      throw new Error('Username sudah terdaftar');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await prisma.user.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        name: dto.name,
        role: dto.role,
      },
    });

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Pengguna tidak ditemukan');

    const isValid = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isValid) {
      throw new Error('Password lama tidak sesuai');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, name: true, role: true, createdAt: true },
    });

    if (!user) throw new Error('Pengguna tidak ditemukan');
    return user;
  }
}
