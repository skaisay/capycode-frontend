import type { Context, Next } from 'hono';
import { verify } from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';

export interface AuthUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
    accessToken: string;
  }
}

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', message: 'Missing or invalid authorization header' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    // Verify with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return c.json({ error: 'Unauthorized', message: 'Invalid token' }, 401);
    }

    // Set user in context
    c.set('user', {
      id: user.id,
      email: user.email!,
      role: user.app_metadata?.role || 'user',
    });
    c.set('accessToken', token);

    await next();
  } catch (err) {
    console.error('Auth error:', err);
    return c.json({ error: 'Unauthorized', message: 'Token verification failed' }, 401);
  }
};

// Optional auth - doesn't fail if no token, but sets user if valid
export const optionalAuthMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    
    try {
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        c.set('user', {
          id: user.id,
          email: user.email!,
          role: user.app_metadata?.role || 'user',
        });
        c.set('accessToken', token);
      }
    } catch {
      // Ignore errors for optional auth
    }
  }

  await next();
};

// Admin-only middleware
export const adminMiddleware = async (c: Context, next: Next) => {
  const user = c.get('user');

  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Forbidden', message: 'Admin access required' }, 403);
  }

  await next();
};
