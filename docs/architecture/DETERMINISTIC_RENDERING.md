# Deterministic Rendering Standard

## Why this matters

Next.js renders HTML on the server, then hydrates it on the client. If the server outputs `5/20/2026` but the client outputs `20/05/2026` (due to different default locales), React throws a hydration mismatch error.

Locale-dependent APIs like `toLocaleDateString()`, `toLocaleString()`, and `Intl.DateTimeFormat` without explicit options use the **runtime's default locale**, which can differ between the Node.js server and the user's browser.

## Approved helpers

| Helper | Location | Example output |
|---|---|---|
| `formatDate(date)` | `src/lib/format-date.ts` | `May 20, 2026` |
| `formatDateTime(date)` | `src/lib/format-date.ts` | `May 20, 2026, 12:49 PM` |
| `formatTime(date)` | `src/lib/format-date.ts` | `12:49 PM` |
| `toISOString(date)` | `src/lib/format-date.ts` | `2026-05-20T12:49:00.000Z` |
| `formatNumber(n)` | `src/lib/format-number.ts` | `12,345` |

All helpers use **explicit `"en-US"` locale** and **`"UTC"` timezone** (for dates), ensuring identical output on server and client.

All date helpers handle `null`, `undefined`, and invalid dates safely (returning `"—"`).

### Why UTC?

UTC is chosen because it is the only timezone guaranteed to be identical on every server and every client. Showing dates in the user's local timezone would require client-only rendering (e.g., `useEffect`) to avoid mismatches. Since this app stores ISO timestamps and does not currently need local-time display, UTC is the simplest correct choice. If local-time display is needed later, render it client-only after mount.

## Banned patterns in SSR-rendered UI

```ts
// ❌ Banned — locale depends on runtime
date.toLocaleDateString()
date.toLocaleString()
date.toLocaleTimeString()
number.toLocaleString()
new Intl.DateTimeFormat()          // without explicit locale + timeZone
new Intl.NumberFormat()            // without explicit locale

// ✅ Safe
formatDate(date)
formatNumber(value)
number.toLocaleString("en-US")     // explicit locale is OK
```

## Safe patterns (no action needed)

- `new Date().toISOString()` — ISO output is locale-independent
- `new Date().getFullYear()` — returns a number
- `new Date().getTime()` — returns a number
- Client-only code (`"use client"` + only rendered after mount) — no SSR involvement
- `toLocaleString("en-US")` — explicit locale is deterministic (but prefer `formatNumber` for consistency)

## `suppressHydrationWarning` policy

**Do NOT** use `suppressHydrationWarning` as a fix for formatting mismatches. Fix the root cause instead.

**Acceptable uses** (must include a comment explaining why):
- Content that is intentionally different between server and client (e.g., relative timestamps like "2 minutes ago" that update on the client)

## Accessibility

When displaying dates/times to users, prefer the `<time>` element:

```tsx
<time dateTime={toISOString(item.created_at)}>
  {formatDate(item.created_at)}
</time>
```

## Examples

### Unsafe → Safe

```tsx
// ❌ Before
<span>{new Date(item.created_at).toLocaleDateString()}</span>

// ✅ After
import { formatDate, toISOString } from "@/lib/format-date";
<time dateTime={toISOString(item.created_at)}>
  {formatDate(item.created_at)}
</time>
```

```tsx
// ❌ Before
<td>{row.tokens.toLocaleString()}</td>

// ✅ After
import { formatNumber } from "@/lib/format-number";
<td>{formatNumber(row.tokens)}</td>
```

