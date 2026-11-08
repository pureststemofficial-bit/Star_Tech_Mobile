// Usage: npm run create-admin -- <email> <password> [name]
// Creates an admin account, or promotes/resets an existing account to admin with the new password.
import { run } from '../src/lib/db.ts';
import { hashPassword, passwordProblem } from '../src/lib/password.ts';
import { isEmail } from '../src/lib/validate.ts';

const [email = '', password = '', ...nameParts] = process.argv.slice(2);
const name = nameParts.join(' ') || 'Administrator';

function fail(msg: string) {
  console.error(`${msg}\nUsage: npm run create-admin -- <email> <password> [name]`);
  process.exit(1);
}

if (!isEmail(email)) fail('Please provide a valid email address.');
const problem = passwordProblem(password);
if (problem) fail(problem);

run(`INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')
     ON CONFLICT(email) DO UPDATE SET role = 'admin', is_active = 1, password_hash = excluded.password_hash`,
  name, email.toLowerCase(), await hashPassword(password));
console.log(`Admin account ready: ${email.toLowerCase()}`);
