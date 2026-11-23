import { BlockList, isIP } from 'node:net';
import { ApiError } from '../../platform/errors.js';

interface LoginRequest {
  socket: { remoteAddress?: string };
  headers: { [name: string]: string | string[] | undefined };
}

/** Canonical network identity only; never persist or log the raw address. */
export function normalizeLoginAddress(value: string): string | null {
  if (isIP(value) === 4) return value;
  if (isIP(value) !== 6 || value.includes('%')) return null;
  const address = new URL(`http://[${value}]/`).hostname.slice(1, -1);
  const mapped = /^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/.exec(address);
  if (!mapped) return address;
  const high = Number.parseInt(mapped[1], 16), low = Number.parseInt(mapped[2], 16);
  return [high >>> 8, high & 255, low >>> 8, low & 255].join('.');
}

function addTrusted(block: BlockList, value: string) {
  const [raw, prefix, ...extra] = value.split('/');
  const address = normalizeLoginAddress(raw), family = address && isIP(address);
  if (!address || !family || extra.length || prefix !== undefined &&
      (!/^\d{1,3}$/.test(prefix) || Number(prefix) < 1 || Number(prefix) > (family === 4 ? 32 : 128) || isIP(raw) !== family))
    throw new Error('LOGIN_TRUSTED_PROXY_CIDRS requires explicit IP addresses or nonzero IPv4/IPv6 CIDRs.');
  const type = family === 4 ? 'ipv4' : 'ipv6';
  if (prefix === undefined) block.addAddress(address, type);
  else block.addSubnet(address, Number(prefix), type);
}

export function parseTrustedLoginProxies(value: string): string[] {
  if (!value.trim()) return [];
  const entries = value.split(',').map(entry => entry.trim());
  if (entries.length > 32) throw new Error('Configure at most 32 trusted login proxy addresses/CIDRs.');
  const block = new BlockList();
  for (const entry of entries) addTrusted(block, entry);
  return entries;
}

/** Trust only an explicitly configured socket peer and walk right to left.
 * All earlier caller-supplied entries are ignored after the first untrusted hop.
 * Gateway provenance/header sanitization must be verified before enabling this.
 */
export function loginSource(request: LoginRequest, trustedProxies: readonly string[]): string {
  const unavailable = () => new ApiError(503, 'client_address_unavailable', 'Sign-in is temporarily unavailable. Contact the cooperative if this continues.');
  const peer = normalizeLoginAddress(request.socket.remoteAddress ?? '');
  if (!peer) throw unavailable();
  const block = new BlockList();
  for (const entry of trustedProxies) addTrusted(block, entry);
  const trusted = (address: string) => block.check(address, isIP(address) === 4 ? 'ipv4' : 'ipv6');
  if (!trusted(peer)) return peer;
  const header = request.headers['x-forwarded-for'];
  if (typeof header !== 'string' || header.length > 1024) throw unavailable();
  const parts = header.split(',');
  if (!parts.length || parts.length > 16) throw unavailable();
  const chain = parts.map(part => normalizeLoginAddress(part.trim()));
  if (chain.some(address => !address)) throw unavailable();
  for (const address of chain.reverse()) if (address && !trusted(address)) return address;
  // A chain consisting entirely of gateways does not establish a client.
  throw unavailable();
}
