import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Behavioral Supabase fake ───────────────────────────────────────
// Instead of asserting `.from().select().eq().eq().single()` call shape,
// this fake actually filters rows — so if the implementation stops
// filtering by user_id, the "wrong user" test fails for a real reason.

interface ProjectRow {
  id: string;
  user_id: string;
}

/**
 * Tiny in-memory fake that supports `.from().select().eq().eq().single()`.
 * Filters actually work, so tests verify behavior, not call shape.
 */
function createBehavioralFake(rows: ProjectRow[]) {
  return {
    from(_table: string) {
      let filtered = [...rows];
      const chain: Record<string, unknown> = {
        select(_cols: string) {
          return chain;
        },
        eq(col: string, val: string) {
          filtered = filtered.filter((r) => r[col as keyof ProjectRow] === val);
          return chain;
        },
        single() {
          const match = filtered.length === 1 ? { id: filtered[0].id } : null;
          return Promise.resolve({ data: match, error: null });
        },
      };
      return chain;
    },
  };
}

/** Variant that always returns a Supabase error (simulates DB/RLS failure). */
function createErrorFake(
  error: { message: string; code: string },
  data: { id: string } | null = null,
) {
  return {
    from(_table: string) {
      const chain: Record<string, unknown> = {
        select(_cols: string) {
          return chain;
        },
        eq(_col: string, _val: string) {
          return chain;
        },
        single() {
          return Promise.resolve({ data, error });
        },
      };
      return chain;
    },
  };
}

// ── Mock wiring ────────────────────────────────────────────────────
// We swap the fake before each test via the shared `activeFake` ref.

type FakeClient = ReturnType<typeof createBehavioralFake>;
let activeFake: FakeClient;

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => activeFake,
}));

// Import AFTER mock registration
const { verifyProjectOwnership } = await import("../verify-project-ownership");

// ── Fixtures ───────────────────────────────────────────────────────
const PROJECT_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PROJECT_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const ALICE = "11111111-1111-1111-1111-111111111111";
const BOB = "22222222-2222-2222-2222-222222222222";

const SEED: ProjectRow[] = [
  { id: PROJECT_A, user_id: ALICE },
  { id: PROJECT_B, user_id: BOB },
];

// ── Tests ──────────────────────────────────────────────────────────

describe("verifyProjectOwnership", () => {
  beforeEach(() => {
    activeFake = createBehavioralFake(SEED);
  });

  // ── Allowed ────────────────────────────────────────────────────

  it("returns true when the user owns the project", async () => {
    expect(await verifyProjectOwnership(PROJECT_A, ALICE)).toBe(true);
  });

  it("returns true for a different user who owns a different project", async () => {
    expect(await verifyProjectOwnership(PROJECT_B, BOB)).toBe(true);
  });

  // ── Denied: wrong user ────────────────────────────────────────

  it("returns false when the project belongs to another user", async () => {
    // Alice's project, Bob's userId → must deny
    expect(await verifyProjectOwnership(PROJECT_A, BOB)).toBe(false);
  });

  it("returns false for the reverse ownership mismatch", async () => {
    // Bob's project, Alice's userId → must deny
    expect(await verifyProjectOwnership(PROJECT_B, ALICE)).toBe(false);
  });

  // ── Denied: project does not exist ────────────────────────────

  it("returns false when the project ID does not exist", async () => {
    expect(await verifyProjectOwnership("nonexistent-id", ALICE)).toBe(false);
  });

  // ── Denied: empty inputs ──────────────────────────────────────

  it("returns false for empty projectId", async () => {
    expect(await verifyProjectOwnership("", ALICE)).toBe(false);
  });

  it("returns false for empty userId", async () => {
    expect(await verifyProjectOwnership(PROJECT_A, "")).toBe(false);
  });

  // ── Denied: Supabase error ────────────────────────────────────

  it("returns false when Supabase returns an error", async () => {
    activeFake = createErrorFake({
      message: "row-level security violation",
      code: "42501",
    });
    expect(await verifyProjectOwnership(PROJECT_A, ALICE)).toBe(false);
  });

  it("returns false when Supabase returns error with non-null data (fail-closed)", async () => {
    // Supabase should never return both, but the security gate must
    // fail-closed: error present → deny, regardless of data.
    activeFake = createErrorFake(
      { message: "unexpected partial", code: "PGRST" },
      { id: PROJECT_A },
    );
    expect(await verifyProjectOwnership(PROJECT_A, ALICE)).toBe(false);
  });

  // ── Anti-enumeration ──────────────────────────────────────────

  it("does not distinguish 'wrong user' from 'project missing'", async () => {
    // Both must return the same false — no information leakage
    const wrongUser = await verifyProjectOwnership(PROJECT_A, BOB);
    const noProject = await verifyProjectOwnership("nonexistent", ALICE);
    expect(wrongUser).toBe(false);
    expect(noProject).toBe(false);
  });

  // ── Empty DB ──────────────────────────────────────────────────

  it("returns false when no projects exist", async () => {
    activeFake = createBehavioralFake([]);
    expect(await verifyProjectOwnership(PROJECT_A, ALICE)).toBe(false);
  });
});
