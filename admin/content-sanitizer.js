/* Maintained DOMPurify allowlist plus explicit URL protocol restrictions. */
window.sanitizePortfolioContent = function (html, siteUrl = location.origin) {
    if (!window.DOMPurify) throw new Error('The content sanitizer could not load. Reload before editing.');
    const clean = window.DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'a', 'blockquote', 'pre', 'code', 'hr', 'img', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'width', 'height', 'colspan', 'rowspan'],
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: false
    });
    const template = document.createElement('template');
    template.innerHTML = clean;
    template.content.querySelectorAll('[href], [src]').forEach((node) => {
      for (const attribute of ['href', 'src']) {
        if (!node.hasAttribute(attribute)) continue;
        try {
          const url = new URL(node.getAttribute(attribute), siteUrl);
          const allowed = attribute === 'href' ? ['https:', 'http:', 'mailto:'] : ['https:', 'http:'];
          if (!allowed.includes(url.protocol)) node.removeAttribute(attribute);
        } catch { node.removeAttribute(attribute); }
      }
    });
    return template.innerHTML.trim();
  };
