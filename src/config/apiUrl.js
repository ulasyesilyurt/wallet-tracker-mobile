const API_PATH = '/api/v1';

function invalid(message) {
  throw new Error(message);
}

function isLocalOrTemporaryHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host === '::1' ||
    host.startsWith('fc') && host.includes(':') ||
    host.startsWith('fd') && host.includes(':') ||
    host.startsWith('fe80:') ||
    /(^|[.-])ngrok([.-]|$)/.test(host) ||
    host === 'loca.lt' || host.endsWith('.loca.lt') ||
    host === 'localtunnel.me' || host.endsWith('.localtunnel.me') ||
    host === 'trycloudflare.com' || host.endsWith('.trycloudflare.com') ||
    host === 'localtest.me' || host.endsWith('.localtest.me') ||
    host === 'lvh.me' || host.endsWith('.lvh.me') ||
    host === 'nip.io' || host.endsWith('.nip.io') ||
    host === 'sslip.io' || host.endsWith('.sslip.io')
  ) {
    return true;
  }

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) {
    // Numeric aliases such as 127.1 and hexadecimal loopback names are unsafe.
    return /^[\d.]+$/.test(host) || /^0x[\da-f]+$/i.test(host);
  }
  const octets = ipv4.slice(1).map(Number);
  if (octets.some(octet => octet > 255)) return true;
  return octets[0] === 0 ||
    octets[0] === 10 ||
    octets[0] === 127 ||
    octets[0] === 169 && octets[1] === 254 ||
    octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31 ||
    octets[0] === 192 && octets[1] === 168;
}

function resolveApiBaseUrl(rawValue, isRelease) {
  if (typeof isRelease !== 'boolean') {
    invalid('API build configuration is unavailable.');
  }
  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    invalid(isRelease ? 'Release API URL is required.' : 'Development API URL is required.');
  }

  const value = rawValue.trim().replace(/^https?:/i, scheme => scheme.toLowerCase());
  if (/[\\\s]/.test(value)) {
    invalid('API URL is malformed.');
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    invalid('API URL is malformed.');
  }

  if (
    !url.hostname || !url.origin ||
    !['http:', 'https:'].includes(url.protocol) ||
    url.username || url.password || url.search || url.hash
  ) {
    invalid('API URL is malformed.');
  }
  if (isRelease && url.protocol !== 'https:') {
    invalid('Release API URL must use HTTPS.');
  }
  if (isRelease && isLocalOrTemporaryHost(url.hostname)) {
    invalid('Release API URL must use a deployed, non-local host.');
  }

  const path = url.pathname.replace(/\/+$/, '');
  if (path.includes(`${API_PATH}/`)) {
    invalid('API URL must contain /api/v1 at most once.');
  }
  const basePath = path.endsWith(API_PATH) ? path : `${path}${API_PATH}`;
  return `${url.origin}${basePath}`;
}

module.exports = {resolveApiBaseUrl};
