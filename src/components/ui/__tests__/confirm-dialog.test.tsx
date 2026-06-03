// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { ConfirmDialog } from "../confirm-dialog";

// ── Helpers ────────────────────────────────────────────────────────

/** Flush the double-rAF used by focusAfterPaint. */
async function flushFocusRestore() {
  // focusAfterPaint uses rAF → rAF; jsdom's rAF is microtask-based.
  await act(async () => {
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
  });
}

function renderDialog(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = overrides.onConfirm ?? vi.fn();
  const result = render(
    <ConfirmDialog
      title="Delete item?"
      message="This cannot be undone."
      confirmLabel="Delete"
      onConfirm={onConfirm}
      trigger={<button>Open</button>}
      variant="danger"
      {...overrides}
    />,
  );
  return { ...result, onConfirm };
}

// ── Tests ──────────────────────────────────────────────────────────

describe("ConfirmDialog", () => {
  afterEach(() => {
    cleanup();
  });

  // ── Rendering ──────────────────────────────────────────────────

  it("does not render dialog content when closed", () => {
    renderDialog();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete item?")).not.toBeInTheDocument();
  });

  it("renders the trigger", () => {
    renderDialog();
    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
  });

  // ── Opening ────────────────────────────────────────────────────

  it("opens dialog when trigger is clicked", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Open" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Delete item?")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
  });

  // ── Accessibility attributes ───────────────────────────────────

  it("has correct aria attributes when open", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Open" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby");
    expect(dialog).toHaveAttribute("aria-describedby");

    // Verify the labelledby/describedby point to real elements with correct text
    const labelId = dialog.getAttribute("aria-labelledby")!;
    const descId = dialog.getAttribute("aria-describedby")!;
    expect(document.getElementById(labelId)?.textContent).toBe("Delete item?");
    expect(document.getElementById(descId)?.textContent).toBe("This cannot be undone.");
  });

  // ── Cancel ─────────────────────────────────────────────────────

  it("closes dialog when Cancel is clicked", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Open" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes dialog when backdrop is clicked", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Open" }));

    // The backdrop is the div with aria-hidden="true"
    const backdrop = screen.getByRole("dialog").querySelector("[aria-hidden='true']");
    expect(backdrop).toBeInTheDocument();
    await user.click(backdrop!);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ── Confirm ────────────────────────────────────────────────────

  it("calls onConfirm exactly once when confirm button is clicked", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("closes dialog after confirm completes", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(() => Promise.resolve());
    renderDialog({ onConfirm });
    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ── Loading state ──────────────────────────────────────────────

  it("disables both buttons during async confirm", async () => {
    const user = userEvent.setup();
    let resolveConfirm: () => void;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        }),
    );
    renderDialog({ onConfirm });
    await user.click(screen.getByRole("button", { name: "Open" }));

    // Start confirm — do NOT await, so we can inspect loading state
    const confirmButton = screen.getByRole("button", { name: "Delete" });
    await act(async () => {
      confirmButton.click();
      // Let the promise start but not resolve
      await Promise.resolve();
    });

    // Both buttons should be disabled while loading
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
    // During loading the confirm button renders a spinner with sr-only "Loading"
    // text, so its accessible name changes. Query all buttons within the dialog
    // and verify every one is disabled.
    const dialogButtons = within(dialog).getAllByRole("button");
    for (const btn of dialogButtons) {
      expect(btn).toBeDisabled();
    }

    // Resolve and let dialog close
    await act(async () => {
      resolveConfirm!();
    });
  });

  // ── Escape key ─────────────────────────────────────────────────

  it("closes dialog on Escape key", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Open" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not close on Escape while loading", async () => {
    const user = userEvent.setup();
    let resolveConfirm: () => void;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        }),
    );
    renderDialog({ onConfirm });
    await user.click(screen.getByRole("button", { name: "Open" }));

    // Start confirm
    const confirmButton = screen.getByRole("button", { name: "Delete" });
    await act(async () => {
      confirmButton.click();
      await Promise.resolve();
    });

    // Try Escape — should NOT close
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Cleanup
    await act(async () => {
      resolveConfirm!();
    });
  });

  it("does not close on backdrop click while loading", async () => {
    const user = userEvent.setup();
    let resolveConfirm: () => void;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        }),
    );
    renderDialog({ onConfirm });
    await user.click(screen.getByRole("button", { name: "Open" }));

    // Start confirm
    const confirmButton = screen.getByRole("button", { name: "Delete" });
    await act(async () => {
      confirmButton.click();
      await Promise.resolve();
    });

    // Try backdrop click — should NOT close
    const backdrop = screen.getByRole("dialog").querySelector("[aria-hidden='true']");
    await user.click(backdrop!);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Cleanup
    await act(async () => {
      resolveConfirm!();
    });
  });

  // ── Focus management ───────────────────────────────────────────

  it("focuses Cancel button when dialog opens", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Open" }));

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("restores focus to trigger after Cancel", async () => {
    const user = userEvent.setup();
    renderDialog();
    const trigger = screen.getByRole("button", { name: "Open" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await flushFocusRestore();

    expect(trigger).toHaveFocus();
  });

  it("restores focus to trigger after Escape", async () => {
    const user = userEvent.setup();
    renderDialog();
    const trigger = screen.getByRole("button", { name: "Open" });
    await user.click(trigger);
    await user.keyboard("{Escape}");
    await flushFocusRestore();

    expect(trigger).toHaveFocus();
  });

  // ── Default props ──────────────────────────────────────────────

  it("uses default title and confirmLabel when not provided", async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog message="Really?" onConfirm={vi.fn()} trigger={<button>Go</button>} />);
    await user.click(screen.getByRole("button", { name: "Go" }));

    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });
});
