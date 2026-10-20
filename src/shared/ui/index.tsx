import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Info, Warning } from '../icons';
import { money } from '../../domain/format';
import styles from './ui.module.css';

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' | 'danger' }) {
  return <button type="button" className={`${styles.button} ${styles[variant]} ${className}`} {...props} />;
}
export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'warning' | 'danger' | 'success' | 'brand'; children: ReactNode }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}
export function Notice({ tone = 'neutral', children, role }: { tone?: 'neutral' | 'warning' | 'danger' | 'success'; children: ReactNode; role?: 'alert' | 'status' }) {
  const Icon = tone === 'warning' || tone === 'danger' ? Warning : Info;
  return <div className={`${styles.notice} ${styles[tone]}`} role={role}><Icon size={20} aria-hidden="true" /><div>{children}</div></div>;
}
export function Money({ value, className = '' }: { value: number; className?: string }) {
  return <span className={`${styles.money} ${className}`}>{money(value)}</span>;
}
