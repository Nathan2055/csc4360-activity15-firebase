import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export function signHostToken(): string {
  return jwt.sign({ role: "host" }, JWT_SECRET, { expiresIn: "12h" });
}

export function requireHost(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload.role !== "host") throw new Error("bad role");
    (req as any).user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function createAuthRoutes(app: import("express").Express) {
  app.post("/api/auth/login", (req, res) => {
    const password = String(req.body?.password || "");
    const expected = process.env.HOST_PASSWORD || "password"; // dev default
    if (password !== expected) return res.status(401).json({ error: "Invalid credentials" });
    const token = signHostToken();
    res.json({ token });
  });
}
