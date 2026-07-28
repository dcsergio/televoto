import crypto from "node:crypto";

const opaqueTokenAlphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const judgeTokenLength = 16;

export function generateOpaqueToken(length: number) {
  const bytes = crypto.randomBytes(length);
  let token = "";

  for (let index = 0; index < length; index += 1) {
    token += opaqueTokenAlphabet[bytes[index] % opaqueTokenAlphabet.length];
  }

  return token;
}

export function hashOpaqueToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
