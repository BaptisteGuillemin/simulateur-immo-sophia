const eurFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const eurFormatter2 = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

const numFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export const formatEuro = (n: number, dec = 0): string =>
  (dec === 0 ? eurFormatter : eurFormatter2).format(n);

export const formatNumber = (n: number): string => numFormatter.format(n);

export const formatPercent = (n: number, decimals = 1): string =>
  `${n.toFixed(decimals)} %`;

export const formatDate = (timestamp: number): string =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(timestamp);
