const RESERVED_SUBDOMAINS = new Set(['www', 'localhost', '127', 'app']);

/**
 * Extrai o slug do subdomínio (ex.: jiparana.localhost → jiparana).
 * Retorna string vazia se não houver subdomínio válido.
 */
export function getSubdomainFromHost(hostname?: string): string {
  if (typeof window === 'undefined' && !hostname) return '';
  const host = (hostname ?? window.location.hostname).toLowerCase();
  const parts = host.split('.');
  
  let slug = '';
  const isIp = /^\\d+\\.\\d+\\.\\d+\\.\\d+$/.test(host);

  if (host.includes('localhost') && parts.length >= 2 && parts[0] !== 'localhost') {
    slug = parts[0];
  } else if (!isIp) {
    if (host.endsWith('.br') && parts.length >= 4) {
      slug = parts[0];
    } else if (!host.endsWith('.br') && parts.length >= 3) {
      slug = parts[0];
    }
  }

  if (RESERVED_SUBDOMAINS.has(slug)) {
    slug = '';
  }

  // Fallback para localStorage (útil para acessos pelo domínio raiz)
  if (!slug && typeof window !== 'undefined') {
    slug = localStorage.getItem('tenant_slug') || '';
  }

  return slug;
}

export function hasTenantSubdomain(hostname?: string): boolean {
  return Boolean(getSubdomainFromHost(hostname));
}
