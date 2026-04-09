import { Request, Response, NextFunction, Router } from "express";
import { supabase, supabaseEnabled } from "./supabase";
import { db } from "./db";
import { admins, Admin } from "@shared/schema";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      admin?: Admin;
    }
  }
}

export async function requireAdminAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!supabaseEnabled || !supabase) {
    return res.status(503).json({ error: "Authentication service unavailable" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.substring(7);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const [admin] = await db
      .select()
      .from(admins)
      .where(eq(admins.adminId, user.id))
      .limit(1);

    if (!admin) {
      return res.status(403).json({ error: "User is not an authorized admin" });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
}

export function createAuthRouter(): Router {
  const router = Router();

  router.post("/login", async (req: Request, res: Response) => {
    if (!supabaseEnabled || !supabase) {
      return res.status(503).json({ error: "Authentication service unavailable" });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return res.status(401).json({ error: error.message });
      }

      const [admin] = await db
        .select()
        .from(admins)
        .where(eq(admins.adminId, data.user.id))
        .limit(1);

      if (!admin) {
        await supabase.auth.signOut();
        return res.status(403).json({ error: "User is not an authorized admin" });
      }

      res.json({
        user: {
          id: admin.adminId,
          email: admin.email,
          role: admin.role,
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  router.post("/logout", requireAdminAuth, async (req: Request, res: Response) => {
    if (!supabase) {
      return res.status(503).json({ error: "Authentication service unavailable" });
    }

    try {
      await supabase.auth.signOut();
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  router.get("/me", requireAdminAuth, async (req: Request, res: Response) => {
    if (!req.admin) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    res.json({
      id: req.admin.adminId,
      email: req.admin.email,
      role: req.admin.role,
      createdAt: req.admin.createdAt,
    });
  });

  router.post("/refresh", async (req: Request, res: Response) => {
    if (!supabaseEnabled || !supabase) {
      return res.status(503).json({ error: "Authentication service unavailable" });
    }

    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    try {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token,
      });

      if (error || !data.session || !data.user) {
        return res.status(401).json({ error: "Failed to refresh session" });
      }

      const [admin] = await db
        .select()
        .from(admins)
        .where(eq(admins.adminId, data.user.id))
        .limit(1);

      if (!admin) {
        return res.status(403).json({ error: "User is not an authorized admin" });
      }

      res.json({
        user: {
          id: admin.adminId,
          email: admin.email,
          role: admin.role,
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
      });
    } catch (error) {
      console.error("Refresh error:", error);
      res.status(500).json({ error: "Token refresh failed" });
    }
  });

  return router;
}
