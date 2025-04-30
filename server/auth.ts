import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { Business as SelectBusiness } from "@shared/schema";
import { z } from "zod";

declare global {
  namespace Express {
    interface User extends SelectBusiness {}
  }
}

const scryptAsync = promisify(scrypt);

// Authentication schema
export const authenticateUser = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type AuthCredentials = z.infer<typeof authenticateUser>;

// Export hashPassword to use in seed.ts
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "storefrontsecret",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      maxAge: 86400000, // 24 hours
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax'
    },
    name: 'bizapp.sid' // Custom session cookie name to avoid conflicts
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const business = await storage.getBusinessByUsername(username);
        if (!business) {
          return done(null, false);
        }
        
        // Check password using secure comparison
        const isValidPassword = await comparePasswords(password, business.password);
        if (!isValidPassword) {
          return done(null, false);
        }
        
        return done(null, business);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((business, done) => done(null, business.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const business = await storage.getBusiness(id);
      done(null, business);
    } catch (error) {
      done(error, null);
    }
  });

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { username, password, ...userData } = req.body;
      
      // Check if username already exists
      const existingBusiness = await storage.getBusinessByUsername(username);
      if (existingBusiness) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Create the business account with hashed password
      const hashedPassword = await hashPassword(password);
      const business = await storage.createBusiness({
        username,
        password: hashedPassword,
        ...userData
      });

      req.login(business, (err) => {
        if (err) return next(err);
        
        // Return the user without password
        const { password, ...businessWithoutPassword } = business;
        res.status(201).json(businessWithoutPassword);
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Failed to register" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, business: SelectBusiness | false, info: { message: string } | undefined) => {
      if (err) return next(err);
      if (!business) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      req.login(business, (err: Error | null) => {
        if (err) return next(err);
        
        // Return the user without password
        const { password, ...businessWithoutPassword } = business;
        res.json(businessWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err: Error | null) => {
      if (err) return next(err);
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Return the user without password
    const { password, ...businessWithoutPassword } = req.user;
    res.json(businessWithoutPassword);
  });
}