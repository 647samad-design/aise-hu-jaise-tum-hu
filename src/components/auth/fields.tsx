"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Icon, { type IconName } from "@/components/Icon";
import { passwordChecks, passwordScore } from "@/lib/validation";

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: string;
  icon?: IconName;
  error?: string;
  hint?: React.ReactNode;
  aside?: React.ReactNode;
};

export function Field({ name, label, icon, error, hint, aside, id, ...rest }: FieldProps) {
  const inputId = id ?? name;
  return (
    <div className="field">
      <div className="field-top">
        <label htmlFor={inputId}>{label}</label>
        {aside}
      </div>
      <div className={`field-box ${error ? "has-error" : ""}`}>
        {icon && <Icon name={icon} size={18} className="field-icon" />}
        <input
          id={inputId}
          name={name}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined}
          {...rest}
        />
      </div>
      {error ? (
        <p id={`${inputId}-err`} className="field-error" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
}

const LEVELS = ["", "Weak", "Fair", "Good", "Strong"];

export function PasswordField({
  name = "password",
  label = "Password",
  error,
  meter = false,
  aside,
  autoComplete = "current-password",
  onValue,
}: {
  name?: string;
  label?: string;
  error?: string;
  meter?: boolean;
  aside?: React.ReactNode;
  autoComplete?: string;
  onValue?: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const [value, setValue] = useState("");
  const score = passwordScore(value);

  return (
    <div className="field">
      <div className="field-top">
        <label htmlFor={name}>{label}</label>
        {aside}
      </div>
      <div className={`field-box ${error ? "has-error" : ""}`}>
        <Icon name="lock" size={18} className="field-icon" />
        <input
          id={name}
          name={name}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            onValue?.(e.target.value);
          }}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${name}-err` : undefined}
        />
        <button
          type="button"
          className="field-toggle"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
        >
          <Icon name={show ? "eye-off" : "eye"} size={18} />
        </button>
      </div>
      {meter && value && (
        <div className="pw-meter" aria-live="polite">
          <div className="pw-bars">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={i <= score ? `on s${score}` : ""} />
            ))}
          </div>
          <span className="pw-label">{LEVELS[score]}</span>
        </div>
      )}
      {meter && value && (
        <ul className="pw-checks">
          {passwordChecks(value).map((c) => (
            <li key={c.label} className={c.ok ? "ok" : ""}>
              <Icon name={c.ok ? "check" : "minus"} size={13} /> {c.label}
            </li>
          ))}
        </ul>
      )}
      {error && <p id={`${name}-err`} className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function SubmitButton({ children, pendingText, className = "btn-primary" }: { children: React.ReactNode; pendingText: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} w-full auth-submit`} aria-busy={pending}>
      {pending ? (
        <>
          <span className="spinner" aria-hidden="true" /> {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function Notice({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: React.ReactNode }) {
  return (
    <div className={`notice notice-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon name={tone === "error" ? "alert" : tone === "success" ? "check" : "info"} size={18} />
      <div>{children}</div>
    </div>
  );
}
