"use client";

/**
 * The [-]/[+] disclosure header every collapsible panel shares. Open state
 * stays in the parent (React-held, never native <details> — see ThoughtList
 * for why: refresh() re-renders would snap DOM-held toggles shut).
 */
export function FoldToggle({
  open,
  onToggle,
  fullWidth = true,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  /** false = shrink to content (when something else shares the header row) */
  fullWidth?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`flex cursor-pointer items-baseline gap-2 text-left tracking-widest hover:brightness-125${
        fullWidth ? " w-full" : ""
      }`}
      aria-expanded={open}
      onClick={onToggle}
    >
      <span aria-hidden="true">{open ? "[-]" : "[+]"}</span>
      <span>{children}</span>
    </button>
  );
}
