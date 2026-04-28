"use client";

import { Button } from "@/components/ui/button";

export function DeleteProjectButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <Button variant="danger" type="submit">
        Delete
      </Button>
    </form>
  );
}

