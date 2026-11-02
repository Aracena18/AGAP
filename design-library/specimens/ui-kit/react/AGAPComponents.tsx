import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import './agap-tokens.css';
import './AGAPComponents.css';

/** Proposed AGAP member/staff UI primitives. These do NOT replace the existing shared UI without review. */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'quiet' | 'danger';
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
};
export function Button({ variant = 'primary', loading = false, disabled, children, className = '', type = 'button', ...props }: ButtonProps) {
  return <button {...props} type={type} disabled={disabled || loading} aria-busy={loading || undefined}
    className={`ag-btn ag-btn--${variant} ${className}`}>
    {loading && <span className="ag-spinner" aria-hidden="true" />}{children}
  </button>;
}

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`ag-badge ag-badge--${tone}`}>{children}</span>;
}
export function Notice({ tone = 'info', title, children, role }: { tone?: Exclude<Tone, 'neutral'>; title: string; children: ReactNode; role?: 'status' | 'alert' }) {
  return <div className={`ag-notice ag-notice--${tone}`} role={role ?? (tone === 'danger' ? 'alert' : 'status')}>
    <span className="ag-notice-dot" aria-hidden="true" />
    <div><strong>{title}</strong><div className="ag-notice-body">{children}</div></div>
  </div>;
}
export function Card({ title, eyebrow, children, className = '' }: { title?: string; eyebrow?: string; children: ReactNode; className?: string }) {
  return <section className={`ag-card ${className}`}>
    {eyebrow && <p className="ag-eyebrow">{eyebrow}</p>}
    {title && <h2 className="ag-card-title">{title}</h2>}{children}
  </section>;
}

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string; hint?: string; error?: string; id?: string;
};
export function TextField({ label, hint, error, id, required, ...inputProps }: TextFieldProps) {
  const generatedId = useId(); const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return <div className="ag-field">
    <label htmlFor={inputId}>{label}{required && <span className="ag-required"> *</span>}</label>
    <input {...inputProps} id={inputId} required={required} aria-invalid={Boolean(error)} aria-describedby={describedBy}/>
    {hint && <p id={hintId} className="ag-hint">{hint}</p>}
    {error && <p id={errorId} className="ag-error">{error}</p>}
  </div>;
}
export type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  label: string; id?: string; hint?: string; error?: string; children: ReactNode;
};
export function SelectField({ label, id, hint, error, children, ...props }: SelectFieldProps) {
  const generatedId = useId(); const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  return <div className="ag-field">
    <label htmlFor={inputId}>{label}</label>
    <select {...props} id={inputId} aria-invalid={Boolean(error)} aria-describedby={[hintId,errorId].filter(Boolean).join(' ')||undefined}>{children}</select>
    {hint && <p id={hintId} className="ag-hint">{hint}</p>}
    {error && <p id={errorId} className="ag-error">{error}</p>}
  </div>;
}
export function SegmentedControl<T extends string>({ label, options, value, onChange }: {
  label: string; options: ReadonlyArray<{ label: string; value: T }>; value: T; onChange: (value: T) => void;
}) {
  return <div className="ag-segments" role="group" aria-label={label}>
    {options.map(option=><button key={option.value} type="button" aria-pressed={value===option.value}
      onClick={()=>onChange(option.value)}>{option.label}</button>)}
  </div>;
}
export function StepProgress({ label, steps, activeIndex }: {label: string; steps: readonly string[]; activeIndex: number }) {
  const completed = Math.max(0, Math.min(activeIndex, steps.length));
  return <div className="ag-progress" style={{ ["--step-count" as string]: steps.length }}>
    <div className="ag-progress-heading"><strong>{label}</strong><span>Step {Math.min(completed + 1, steps.length)} of {steps.length}</span></div>
    <ol>{steps.map((step,i)=><li key={`${i}-${step}`} className={i<completed?'ag-step-done':i===completed?'ag-step-current':''}
      aria-current={i===completed?'step':undefined}>{step}</li>)}</ol>
  </div>;
}
export function GabayHelp({ imageSrc, title, children, actionLabel, onAction }: {
  imageSrc: string; title: string; children: ReactNode; actionLabel?: string; onAction?: ()=>void;
}) {
  return <aside className="ag-gabay" aria-label="Gabay guidance">
    <img src={imageSrc} alt="" loading="lazy" width="160" height="160" />
    <div><h2>{title}</h2><div>{children}</div>
      {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
    </div>
  </aside>;
}
