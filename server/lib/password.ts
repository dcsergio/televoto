import crypto from "node:crypto";

export const passwordHashIterations = 210000;

export type PasswordRecord = {
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
};

export function hashPassword(password: string, salt: string, iterations: number) {
  return crypto.pbkdf2Sync(password, salt, iterations, 64, "sha512").toString("hex");
}

export function createPasswordRecord(password: string): PasswordRecord {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    passwordHash: hashPassword(password, salt, passwordHashIterations),
    passwordSalt: salt,
    passwordIterations: passwordHashIterations,
  };
}

export function verifyPassword(password: string, record: PasswordRecord) {
  const computed = hashPassword(password, record.passwordSalt, record.passwordIterations);
  const expected = Buffer.from(record.passwordHash, "hex");
  const actual = Buffer.from(computed, "hex");
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}
