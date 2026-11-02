import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

export interface RenderedDoc {
  html: string;
  toc: { id: string; text: string; level: number }[];
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function headingId(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Blocs :::info / :::warning / :::danger */
function transformCallouts(source: string): string {
  return source.replace(/^:::(info|warning|danger|note)\n([\s\S]*?)^:::$/gm, (_m, kind: string, body: string) => `<div class="callout callout-${kind}">\n\n${body.trim()}\n\n</div>`);
}

/** Blocs ```chart et ```mermaid transformés en conteneurs interprétés côté navigateur */
function transformBlocks(source: string): string {
  return source
    .replace(/```chart\n([\s\S]*?)```/g, (_m, payload: string) => {
      return `<div class="lab-chart" data-chart="${escapeHtml(payload.trim())}"></div>`;
    })
    .replace(/```mermaid\n([\s\S]*?)```/g, (_m, payload: string) => {
      return `<div class="lab-mermaid" data-mermaid="${escapeHtml(payload.trim())}"></div>`;
    });
}

export function renderDocument(source: string): RenderedDoc {
  const toc: RenderedDoc['toc'] = [];
  const prepared = transformBlocks(transformCallouts(source ?? ''));

  const renderer = new marked.Renderer();
  renderer.heading = ({ tokens, depth }) => {
    const text = renderer.parser.parseInline(tokens);
    const plain = text.replace(/<[^>]+>/g, '');
    const id = headingId(plain);
    if (depth <= 3)
      toc.push({
        id,
        text: plain
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&'),
        level: depth,
      });
    return `<h${depth} id="${id}">${text}</h${depth}>\n`;
  };

  const raw = marked.parse(prepared, { renderer, async: false, gfm: true, breaks: false }) as string;

  // Sanitisation pour la sécurité : bloque JavaScript mais autorise HTML et CSS
  const html = sanitizeHtml(raw, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      'img', 'figure', 'figcaption', 'details', 'summary', 'style', 
      'section', 'article', 'aside', 'nav', 'header', 'footer', 'main',
      'span', 'div', 'video', 'source', 'audio', 'iframe',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'mark', 'small', 'abbr', 'cite', 'time', 'kbd', 'sub', 'sup',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption'
    ],
    allowedAttributes: {
      '*': ['class', 'id', 'style', 'data-*', 'colspan', 'rowspan', 'align', 'title', 'aria-*'],
      a: ['href', 'name', 'target', 'rel', 'title', 'download'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'srcset', 'sizes'],
      video: ['src', 'controls', 'poster', 'width', 'height', 'autoplay', 'loop', 'muted', 'preload'],
      audio: ['src', 'controls', 'autoplay', 'loop', 'muted', 'preload'],
      source: ['src', 'type'],
      iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'loading'],
      table: ['border', 'cellpadding', 'cellspacing'],
      td: ['colspan', 'rowspan', 'align', 'valign'],
      th: ['colspan', 'rowspan', 'align', 'valign', 'scope'],
      time: ['datetime'],
      abbr: ['title'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'data'],
    allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'player.vimeo.com', 'vimeo.com'],
    allowVulnerableTags: true,
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: attribs['href']?.startsWith('http') ? { ...attribs, target: '_blank', rel: 'noopener noreferrer' } : attribs,
      }),
    },
  });

  return { html, toc };
}

export function plainText(source: string): string {
  return (source ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*_>`|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
