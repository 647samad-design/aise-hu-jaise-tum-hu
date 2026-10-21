export function Divider({ children = "or" }: { children?: React.ReactNode }) {
  return (
    <div className="auth-divider" role="separator">
      <span>{children}</span>
    </div>
  );
}
