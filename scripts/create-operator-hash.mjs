import { randomBytes, scryptSync } from "node:crypto";

const password = process.env.EPICGRAM_OPERATOR_PASSWORD;

if (!password) {
  console.error("Set EPICGRAM_OPERATOR_PASSWORD in the current shell before running this script.");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");

console.log(`scrypt:${salt}:${hash}`);
