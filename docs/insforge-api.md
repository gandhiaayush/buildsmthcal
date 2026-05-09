# InsForge API Reference

> **RULE:** Read this file before writing any InsForge code. Do not rely on training knowledge — use these docs as source of truth.

## Project Info

- **Project:** My First Project
- **Region:** `fy4p4tyq.us-east`
- **Dashboard:** https://insforge.dev/dashboard/project/ff1bc9b3-a7c6-4802-bdeb-9ba9220503ed
- **Config file:** `.insforge/project.json` — `oss_host` is the base URL, `api_key` is full-access admin (server-only, never frontend)

---

## CLI — Always Use npx

```bash
npx @insforge/cli <command>   # NEVER install globally
npx @insforge/cli whoami      # verify auth
npx @insforge/cli current     # verify linked project
```

**Before any task:** run `npx @insforge/cli metadata --json` to discover what's configured (auth, tables, buckets, functions, AI models, realtime channels).

---

## SDK Setup

```bash
npm install @insforge/sdk@latest
```

Get env vars:
```bash
npx @insforge/cli secrets get ANON_KEY   # anon key
# oss_host from .insforge/project.json  # base URL
```

For Next.js (`.env.local`):
```bash
NEXT_PUBLIC_INSFORGE_URL=https://your-appkey.us-east.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=eyJhbGci...
```

Client init:
```javascript
import { createClient } from '@insforge/sdk'

const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
})
```

**DO NOT use:** `@insforge/react`, `@insforge/nextjs`, `@insforge/react-router` — all deprecated.

All SDK methods return `{ data, error }`.

---

## Database

```javascript
// Select
const { data, error } = await insforge.database.from('posts').select()
const { data } = await insforge.database.from('posts').select('id, title')
const { data } = await insforge.database.from('posts').select('*, comments(id, content)')

// Insert — MUST use array format
const { data, error } = await insforge.database
  .from('posts')
  .insert([{ title: 'Hello', content: 'World' }])
  .select()

// Update
const { data, error } = await insforge.database
  .from('posts')
  .update({ title: 'Updated' })
  .eq('id', postId)
  .select()

// Delete
const { error } = await insforge.database.from('posts').delete().eq('id', postId)

// RPC
const { data, error } = await insforge.database.rpc('fn_name', { user_id: '123' })

// Pagination
const { data, count } = await insforge.database
  .from('posts')
  .select('*', { count: 'exact' })
  .range(from, to)
  .order('created_at', { ascending: false })
```

**Filters:** `.eq()` `.neq()` `.gt()` `.gte()` `.lt()` `.lte()` `.like()` `.ilike()` `.in()` `.is()`
**Modifiers:** `.order()` `.limit()` `.range()` `.single()` `.maybeSingle()`

### SQL Patterns

```sql
-- Built-in references
auth.uid()                    -- current user UUID
auth.users(id)                -- FK reference to users table
system.update_updated_at()    -- trigger function for updated_at

-- Table with RLS + trigger
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_posts" ON posts
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();
```

### Migrations

```bash
npx @insforge/cli db tables / indexes / policies / triggers / functions  # inspect schema first
npx @insforge/cli db migrations list                                      # remote history
npx @insforge/cli db migrations fetch                                     # sync remote -> local
npx @insforge/cli db migrations new create-posts                          # create next file
# edit migrations/<version>_create-posts.sql
npx @insforge/cli db migrations up --all                                  # apply pending
```

Filename format: `YYYYMMDDHHmmss_migration-name.sql` (hyphens only, no underscores)
Do NOT add `BEGIN`/`COMMIT`/`ROLLBACK` — backend wraps in transaction.

---

## Auth

```javascript
// Sign up
const { data, error } = await insforge.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword123',
  name: 'John Doe',
  redirectTo: 'http://localhost:3000/sign-in'  // for link-based verification
})
// data.requireEmailVerification + data.verifyEmailMethod ('code'|'link')

// Sign in
const { data, error } = await insforge.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword123'
})
// error.statusCode === 403 means email not verified

// OAuth (SPA — auto handles everything)
await insforge.auth.signInWithOAuth({
  provider: 'google',
  redirectTo: 'http://localhost:3000/dashboard'
})
// SDK auto-detects insforge_code in URL and exchanges it

// Sign out
await insforge.auth.signOut()

// Get current user
const { data, error } = await insforge.auth.getCurrentUser()

// Email verification (code flow)
const { data, error } = await insforge.auth.verifyEmail({
  email: 'user@example.com',
  otp: '123456'
})
// auto-saves session on success

// Password reset
await insforge.auth.sendResetPasswordEmail({ email, redirectTo })
const { data } = await insforge.auth.exchangeResetPasswordToken({ email, code })
await insforge.auth.resetPassword({ newPassword, otp: data.token })

// Profile
const { data } = await insforge.auth.getProfile('user-id')
const { data } = await insforge.auth.setProfile({ name: 'John', avatar_url: '...' })
```

**Auth loading pattern (critical for cold loads):**
```tsx
const AuthContext = createContext({ user: null, loading: true })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function hydrateAuth() {
      const { data, error } = await insforge.auth.getCurrentUser()
      if (cancelled) return
      setUser(error ? null : (data?.user ?? null))
      setLoading(false)
    }
    void hydrateAuth()
    return () => { cancelled = true }
  }, [])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}
```

Gate UI on `loading`, not just `user` — especially after OAuth, Stripe, email-verify redirects.

---

## Storage

```javascript
// Upload with specific path
const { data, error } = await insforge.storage
  .from('images')
  .upload('posts/post-123/cover.jpg', fileObject)
// Save BOTH data.url and data.key to DB

// Upload with auto-generated key
const { data, error } = await insforge.storage
  .from('uploads')
  .uploadAuto(fileObject)

// Download (use key, not url)
const { data: blob, error } = await insforge.storage.from('images').download(post.image_key)
const url = URL.createObjectURL(blob)

// Delete
const { data, error } = await insforge.storage.from('images').remove(post.image_key)
```

**Critical:** Always save both `url` (for display) AND `key` (for download/delete). Bucket must exist first (`npx @insforge/cli storage buckets` / `storage create-bucket`).

---

## AI

**ALWAYS check available models first:**
```bash
npx @insforge/cli metadata --json
# or
npx @insforge/cli db query "SELECT model_id, provider, is_active, input_modality, output_modality FROM ai.configs WHERE is_active = true"
```

Never hardcode model IDs.

```javascript
// Chat completions
const completion = await insforge.ai.chat.completions.create({
  model: MODEL_ID,  // exact model_id from ai.configs
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello' }
  ],
  temperature: 0.7,
  maxTokens: 1000
})
console.log(completion.choices[0].message.content)

// Embeddings
const response = await insforge.ai.embeddings.create({
  model: EMBEDDING_MODEL_ID,
  input: 'Hello world'
})
const embedding = response.data[0].embedding  // number[]

// Image generation
const response = await insforge.ai.images.generate({
  model: IMAGE_MODEL_ID,
  prompt: 'A mountain landscape',
  size: '1024x1024'
})
// Returns base64 — upload to storage, don't store in DB
```

---

## Real-time

Create channel patterns in DB first:
```sql
INSERT INTO realtime.channels (pattern, description, enabled)
VALUES ('order:%', 'Order status updates', true);
```

```javascript
// Connect and subscribe
await insforge.realtime.connect()
const response = await insforge.realtime.subscribe('order:123')
// response.presence.members = initial snapshot (seed local state from this)

// Listen
insforge.realtime.on('status_changed', (payload) => { /* ... */ })
insforge.realtime.on('presence:join', ({ member, meta }) => { /* ... */ })
insforge.realtime.on('presence:leave', ({ member, meta }) => { /* ... */ })

// Publish (must be subscribed first)
await insforge.realtime.publish('order:123', 'viewed', { viewedAt: new Date().toISOString() })

// Cleanup
insforge.realtime.unsubscribe('order:123')
insforge.realtime.disconnect()

// Connection events
insforge.realtime.on('connect', () => {})
insforge.realtime.on('disconnect', (reason) => {})
insforge.realtime.on('connect_error', (err) => {})
```

Do NOT wait for own `presence:join` — own presence is already in `subscribe()` response.
Gate user-dependent side effects on auth hydration (`loading === false`).

---

## Email

Private preview — requires paid plan.

```javascript
const { data, error } = await insforge.emails.send({
  to: 'user@example.com',          // or array of up to 50
  subject: 'Welcome',
  html: '<h1>Hello</h1>',
  from: 'Acme Updates',            // display name only, NOT email address
  replyTo: 'support@acme.com',
  cc: 'manager@example.com',
  bcc: ['archive@example.com'],
})
// data.skipped = unsubscribed recipients (not failures)
```

Sender address is fixed at `noreply@<appkey>.send.insforge.dev`. Max 50 recipients/request.

---

## Payments

```bash
npx @insforge/cli payments status          # check availability first
npx @insforge/cli payments config set test sk_test_xxx
npx @insforge/cli payments sync --environment test
npx @insforge/cli payments catalog --environment test
```

```javascript
// Checkout (use 'test' until approved for live)
const { data, error } = await insforge.payments.createCheckoutSession('test', {
  mode: 'subscription',           // or 'payment' for one-time
  lineItems: [{ stripePriceId: 'price_123', quantity: 1 }],
  successUrl: `${window.location.origin}/billing/success`,
  cancelUrl: `${window.location.origin}/billing`,
  subject: { type: 'team', id: teamId },  // required for subscription
  customerEmail: user.email,
  idempotencyKey: `subscription:${teamId}:monthly`
})
if (data?.checkoutSession.url) window.location.assign(data.checkoutSession.url)

// Customer portal
const { data, error } = await insforge.payments.createCustomerPortalSession('test', {
  subject: { type: 'team', id: teamId },
  returnUrl: `${window.location.origin}/billing`
})
if (data?.customerPortalSession.url) window.location.assign(data.customerPortalSession.url)
```

**Before any payments UI:** add RLS on `payments.checkout_sessions` and `payments.customer_portal_sessions`.
**Never** put Stripe secret keys in frontend. Use `payments config set`, not `secrets add`.
Success URL ≠ fulfillment — read from app-owned tables updated by webhook.

---

## Functions (Edge)

```bash
npx @insforge/cli functions list
npx @insforge/cli functions deploy my-handler   # source: insforge/functions/my-handler/index.ts
npx @insforge/cli functions invoke my-handler --data '{"action":"test"}'
```

```javascript
const { data, error } = await insforge.functions.invoke('hello-world', {
  body: { name: 'World' }  // default POST
})
// invoke URL: {oss_host}/functions/{slug}  (NOT /api/functions/)
```

Function must be deployed and `status: "active"`.

---

## Branches (Risky Changes)

Use for: destructive DDL, new RLS on user-data tables, OAuth config changes.

```bash
npx @insforge/cli branch create feat-x --mode schema-only
# restart dev server — INSFORGE_URL and INSFORGE_ANON_KEY change
# apply migrations, test SDK against branch
npx @insforge/cli branch merge feat-x --dry-run
npx @insforge/cli branch merge feat-x
npx @insforge/cli branch delete feat-x
```

After `branch create` or `branch switch`, **restart dev server** — SDK caches old URL.

---

## Diagnostics

```bash
npx @insforge/cli diagnose                           # full health report
npx @insforge/cli diagnose --ai "describe issue"     # AI-assisted diagnosis
npx @insforge/cli diagnose metrics --range 24h
npx @insforge/cli diagnose db --check bloat,slow-queries
npx @insforge/cli logs function.logs                 # function issues
npx @insforge/cli logs postgres.logs                 # DB query problems
npx @insforge/cli logs insforge.logs                 # auth/API errors
```

---

## Secrets & Schedules

```bash
npx @insforge/cli secrets get ANON_KEY
npx @insforge/cli secrets add MY_KEY my_value
npx @insforge/cli secrets list

# Cron (5-field) — NOT 6-field/Quartz
npx @insforge/cli schedules create \
  --name "Cleanup" \
  --cron "*/5 * * * *" \
  --url "https://app.insforge.app/functions/cleanup" \
  --method POST
# Sub-minute: --cron "30 seconds"
```

---

## Framework Env Var Prefixes

| Framework | Prefix | File |
|-----------|--------|------|
| Next.js | `NEXT_PUBLIC_` | `.env.local` |
| Vite | `VITE_` | `.env` |
| Astro/SvelteKit | `PUBLIC_` | `.env` |
| CRA | `REACT_APP_` | `.env` |
| Node.js | (none) | `.env` |

---

## Common Mistakes Quick Reference

| Mistake | Fix |
|---------|-----|
| `insert({...})` single object | `insert([{...}])` array always |
| Hardcoding AI model ID | Query `ai.configs` first |
| Storing only `url` from storage | Store both `url` AND `key` |
| Using URL for storage delete | Use `key` |
| OAuth `redirectTo` pointing at backend | Must point at your app |
| No `loading` guard on auth | Gate user-dependent effects on `loading === false` |
| Success URL = fulfillment | Read app-owned table, fulfill from webhook |
| `@insforge/react` package | Use `@insforge/sdk` directly |
| Stripe secret key in frontend | `payments config set test sk_test_xxx` |
| 6-field cron `*/2 * * * * *` | Use `2 seconds` for sub-minute |
| `flyctl` directly for compute | `npx @insforge/cli compute deploy` |
| `npm install -g @insforge/cli` | Always `npx @insforge/cli` |
