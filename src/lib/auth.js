import crypto from "crypto";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) console.warn("WARNING: JWT_SECRET environment variable is not set. Sessions will not work.");

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedPassword) {
  if (!storedPassword || !storedPassword.includes(":")) return false;
  const [salt, hash] = storedPassword.split(":");
  const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === testHash;
}

// Simple HMAC signing for session security (lightweight JWT implementation)
export function createSessionToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifySessionToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  
  const testSignature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  if (signature !== testSignature) return null; // Signature mismatch (tampered token)
  
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.exp < Date.now()) return null; // Expired token
    return payload;
  } catch (e) {
    return null;
  }
}

// Cookie helpers for Server Components and Actions
export async function getSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("pademco_session")?.value;
    return verifySessionToken(token);
  } catch (e) {
    return null;
  }
}

export async function setSessionCookie(payload) {
  const token = createSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set("pademco_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("pademco_session");
}
