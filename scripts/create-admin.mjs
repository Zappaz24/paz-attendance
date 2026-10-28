/**
 * Creates (or resets) the single admin account used by this build.
 *
 * Usage:
 *   npm run admin:create
 *   npm run admin:create -- principal@school.test "a-strong-password" "Mrs. Reyes"
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (from `npx supabase status`).
 * The service-role key stays on this machine and is never sent to the browser.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error(
    [
      "Missing SUPABASE_SERVICE_ROLE_KEY.",
      "Run `npx supabase status`, copy the service_role key into .env.local, then retry.",
    ].join("\n"),
  );
  process.exit(1);
}

const email = process.argv[2] ?? process.env.ADMIN_EMAIL ?? "admin@school.test";
const password = process.argv[3] ?? process.env.ADMIN_PASSWORD ?? "admin12345";
const fullName = process.argv[4] ?? process.env.ADMIN_NAME ?? "School Admin";

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existing, error: listError } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});

if (listError) {
  console.error(`Could not list users: ${listError.message}`);
  process.exit(1);
}

const current = existing.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());

let userId;

if (current) {
  const { error } = await admin.auth.admin.updateUserById(current.id, {
    password,
    user_metadata: { full_name: fullName },
    email_confirm: true,
  });

  if (error) {
    console.error(`Could not update admin: ${error.message}`);
    process.exit(1);
  }

  userId = current.id;
  console.log(`Updated existing admin: ${email}`);
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error || !data.user) {
    console.error(`Could not create admin: ${error?.message ?? "unknown error"}`);
    process.exit(1);
  }

  userId = data.user.id;
  console.log(`Created admin: ${email}`);
}

// The auth.users trigger creates the profile; this upsert repairs older rows.
const { error: profileError } = await admin
  .from("profiles")
  .upsert({ id: userId, full_name: fullName, role: "admin" }, { onConflict: "id" });

if (profileError) {
  console.error(`Could not write profile: ${profileError.message}`);
  process.exit(1);
}

console.log("\nSign in with:");
console.log(`  email:    ${email}`);
console.log(`  password: ${password}`);
