// Fire-and-forget re-train of the current tenant's knowledge base.
// Called after the dashboard pages save a product, FAQ, policy, or payment
// method so the AI assistant picks up the change without the user having to
// click "Re-train" manually. Errors are swallowed deliberately — rate-limit
// hits or transient failures shouldn't disrupt the save UX.
export function triggerTrain(): void {
  if (typeof window === "undefined") return;
  fetch("/api/train", { method: "POST", keepalive: true }).catch(() => {});
}
