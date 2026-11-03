/** Decorative artwork accompanies real HTML content; it never signals a financial outcome. */
export function Gabay({ empty = false, className = '' }: { empty?: boolean; className?: string }) {
  return <img className={className} src={`${import.meta.env.BASE_URL}workspace/${empty ? 'gabay-no-applications' : 'gabay-welcome'}.webp`} alt="" width={1600} height={1600} decoding="async" loading="lazy"/>;
}
