import { Plugin, Document, Database } from '@nebula-db/core';
import * as crypto from 'crypto';

export interface User extends Document {
  username: string;
  email: string;
  passwordHash?: string;
  roles?: string[];
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthOptions {
  algorithm?: 'pbkdf2' | 'argon2';
  iterations?: number;
  keyLength?: number;
  sessionsCollection?: string;
}

export interface Session {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface AccessControl {
  collection: string;
  roles?: string[];
  permissions?: string[];
  level: 'read' | 'write' | 'admin';
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],
  editor: ['read', 'write', 'create', 'delete'],
  viewer: ['read']
};

export class AuthPlugin implements Plugin {
  name = 'auth';
  private db: Database | null = null;
  private sessions: Map<string, Session> = new Map();
  private options: Required<AuthOptions>;
  private accessControls: AccessControl[] = [];

  constructor(options: AuthOptions = {}) {
    this.options = {
      algorithm: options.algorithm || 'pbkdf2',
      iterations: options.iterations || 100000,
      keyLength: options.keyLength || 64,
      sessionsCollection: options.sessionsCollection || '_sessions'
    };
  }

  async onInit(db: Database): Promise<void> {
    this.db = db;
    await db.collection(this.options.sessionsCollection);
  }

  async register(
    username: string,
    email: string,
    password: string,
    roles: string[] = ['viewer']
  ): Promise<User> {
    const passwordHash = await this.hashPassword(password);

    const user: User = {
      id: crypto.randomUUID(),
      username,
      email,
      passwordHash,
      roles,
      permissions: this.getPermissionsForRoles(roles),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.db!.collection('users').insert(user);
    return user;
  }

  async login(
    email: string,
    password: string
  ): Promise<{ user: User; session: Session } | null> {
    const users = this.db!.collection('users');
    const user = await users.findOne({ email });

    if (!user) return null;

    const valid = await this.verifyPassword(password, user.passwordHash!);
    if (!valid) return null;

    const session = await this.createSession(user.id as string);
    return { user, session };
  }

  async logout(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async validateSession(sessionId: string): Promise<User | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    if (new Date(session.expiresAt) < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }

    const users = this.db!.collection('users');
    return await users.findOne({ id: session.userId });
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(
      password,
      salt,
      this.options.iterations,
      this.options.keyLength,
      'sha512'
    );

    return `${salt}:${hash.toString('hex')}`;
  }

  private async verifyPassword(
    password: string,
    storedHash: string
  ): Promise<boolean> {
    const [salt, hash] = storedHash.split(':');
    const verify = crypto.pbkdf2Sync(
      password,
      salt,
      this.options.iterations,
      this.options.keyLength,
      'sha512'
    );

    return hash === verify.toString('hex');
  }

  private async createSession(userId: string): Promise<Session> {
    const session: Session = {
      id: crypto.randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    this.sessions.set(session.id, session);
    return session;
  }

  private getPermissionsForRoles(roles: string[]): string[] {
    const permissions = new Set<string>();

    for (const role of roles) {
      const rolePerms = ROLE_PERMISSIONS[role];
      if (rolePerms) {
        rolePerms.forEach(p => permissions.add(p));
      }
    }

    return Array.from(permissions);
  }

  canAccess(
    user: User | null,
    collection: string,
    level: 'read' | 'write' | 'admin'
  ): boolean {
    if (!user) return level === 'read';

    const acl = this.accessControls.find(a => a.collection === collection);
    if (!acl) return true;

    const userRoles = user.roles || [];
    const userPerms = user.permissions || [];

    if (userPerms.includes('*')) return true;

    if (acl.roles?.some(r => userRoles.includes(r))) return true;
    if (acl.permissions?.some(p => userPerms.includes(p))) return true;

    return false;
  }

  defineAccess(acl: AccessControl): void {
    this.accessControls.push(acl);
  }

  requireAuth(collection: string, level: 'read' | 'write' = 'read'): void {
    this.defineAccess({
      collection,
      level,
      permissions: [level]
    });
  }
}

export function createAuthPlugin(options?: AuthOptions): AuthPlugin {
  return new AuthPlugin(options);
}