/** Recherche pondérée tolérante aux fautes (accents et pluriels ignorés). */

export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stem(word: string): string {
  return word.replace(/(aux|eaux|s|x)$/i, '');
}

function distance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const row = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + cost);
    }
    prev = row;
  }
  return prev[n]!;
}

function tokenScore(term: string, token: string): number {
  if (token === term) return 1;
  if (token.startsWith(term) && term.length >= 3) return 0.85;
  if (token.includes(term) && term.length >= 4) return 0.7;
  const st = stem(token);
  const sterm = stem(term);
  if (st === sterm) return 0.9;
  const d = distance(sterm, st);
  if (d === 1 && term.length >= 4) return 0.6;
  if (d === 2 && term.length >= 6) return 0.4;
  return 0;
}

export interface Weighted {
  title: string;
  tags: string[];
  body: string;
}

export function scoreItem(query: string, item: Weighted): number {
  const terms = normalize(query).split(' ').filter(Boolean);
  if (!terms.length) return 0;
  const fields: [string[], number][] = [
    [normalize(item.title).split(' ').filter(Boolean), 6],
    [normalize(item.tags.join(' ')).split(' ').filter(Boolean), 3],
    [normalize(item.body).split(' ').filter(Boolean).slice(0, 4000), 1],
  ];
  let total = 0;
  for (const term of terms) {
    let best = 0;
    for (const [tokens, weight] of fields) {
      for (const token of tokens) {
        const s = tokenScore(term, token) * weight;
        if (s > best) best = s;
        if (best === weight) break;
      }
    }
    total += best;
  }
  return total / terms.length;
}

export function highlight(query: string, text: string, size = 220): string {
  const terms = normalize(query).split(' ').filter(Boolean);
  const normalized = normalize(text);
  let index = -1;
  for (const term of terms) {
    const found = normalized.indexOf(term.slice(0, Math.max(3, term.length - 1)));
    if (found >= 0) {
      index = found;
      break;
    }
  }
  const start = Math.max(0, index < 0 ? 0 : index - 60);
  let snippet = text.slice(start, start + size).trim();
  if (start > 0) snippet = `… ${snippet}`;
  if (start + size < text.length) snippet = `${snippet} …`;
  for (const term of terms) {
    if (term.length < 3) continue;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*)`, 'gi');
    snippet = snippet.replace(regex, '<mark>$1</mark>');
  }
  return snippet;
}
