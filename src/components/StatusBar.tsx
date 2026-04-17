import type { StatusBarProps } from "../core";

export function StatusBar({ status }: StatusBarProps) {
  return (
    <footer className="status-bar">
      {status}
    </footer>
  );
}