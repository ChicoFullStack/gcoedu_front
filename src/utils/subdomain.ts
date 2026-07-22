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
  if (parts.length >= 2) {
    const first = parts[0] ?? '';
    if (first && !RESERVED_SUBDOMAINS.has(first)) {
      slug = first;
    }
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
