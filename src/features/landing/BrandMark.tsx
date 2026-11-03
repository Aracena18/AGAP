import navigation from '../../shared/navigation/navigation.module.css';

// Reuse the accepted workspace mark instead of introducing a landing-only logo.
export function BrandMark({ className = '' }: { className?: string }) {
  return <span className={`${navigation.mark} ${className}`} aria-hidden="true"><span/><span/><span/></span>;
}
