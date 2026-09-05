/**
 * PRAYOG design audit — contrast, clipping and structure, measured in a running page.
 *
 * The static guard (scripts/check-design.mjs) cannot see a background that is
 * composited at run time: a gradient, a translucent panel over the page wash, a
 * pill painted by an absolutely-positioned sibling. This does, by walking the
 * real computed styles.
 *
 * Load it into a page and call window.__audit():
 *   const s = document.createElement('script');
 *   s.src = '/audit-design.js';
 *   document.head.appendChild(s);
 *
 * It is browser code on purpose and never ships in a route.
 */
window.__audit = function () {
  const rootStyle = getComputedStyle(document.documentElement);

  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lum = (c) => 0.2126 * lin(c.r / 255) + 0.7152 * lin(c.g / 255) + 0.0722 * lin(c.b / 255);

  /** Composite a colour with alpha over an opaque one behind it. */
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });

  /**
   * Parse a computed colour.
   *
   * `color-mix()` has to be handled explicitly: the top bar declares its
   * scrolled state as `color-mix(in srgb, var(--deep) 82%, transparent)`, and a
   * parser that skips it walks past the bar entirely and measures the bar's
   * text against the page ground — which reported the whole navigation as
   * unreadable when it is nothing of the kind.
   */
  const parse = (s) => {
    if (!s) return null;
    const mix = /^color-mix\(in [a-z-]+,\s*(.+?)\s+([\d.]+)%,\s*transparent\)$/i.exec(s.trim());
    if (mix) {
      const base = parse(resolve(mix[1]));
      if (!base) return null;
      return { ...base, a: base.a * (parseFloat(mix[2]) / 100) };
    }
    /*
     * Chrome resolves color-mix() into the color() function rather than rgba(),
     * so a parser that only knows rgba() walks straight past the scrolled top
     * bar and measures its labels against the page ground instead. Components
     * here are 0-1 floats, not 0-255.
     */
    const fn = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/i.exec(s.trim());
    if (fn) {
      return {
        r: parseFloat(fn[1]) * 255,
        g: parseFloat(fn[2]) * 255,
        b: parseFloat(fn[3]) * 255,
        a: fn[4] === undefined ? 1 : parseFloat(fn[4]),
      };
    }
    const m = /rgba?\(([^)]+)\)/.exec(s);
    if (!m) return null;
    const p = m[1].split(/[,/]/).map((x) => parseFloat(x));
    if (p.length < 3 || p.some((n) => Number.isNaN(n))) return null;
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };

  /** `var(--x)` only means something once the custom property is read. */
  const resolve = (value) => {
    const v = /^var\((--[a-z0-9-]+)\)$/i.exec(value.trim());
    return v ? rootStyle.getPropertyValue(v[1]).trim() : value;
  };

  /** The opaque colour actually painted behind an element. */
  const bgOf = (el) => {
    let acc = null;
    let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) {
        acc = acc ? over(acc, c) : c;
        if (acc.a >= 0.999) return acc;
      }
      /*
       * A gradient with no colour under it leaves the element transparent, and
       * the walk continues past it — which is correct, and is how the primary
       * button was caught painting white text at 1.2 : 1 on the page ground.
       */
      n = n.parentElement;
    }
    const body = parse(getComputedStyle(document.body).backgroundColor);
    if (acc && body) return over(acc, body.a >= 0.999 ? body : { r: 252, g: 251, b: 247, a: 1 });
    return body && body.a >= 0.999 ? body : { r: 252, g: 251, b: 247, a: 1 };
  };

  const ratio = (a, b) => {
    const l1 = lum(a);
    const l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  /**
   * An element that is deliberately stacked above something painted by a
   * sibling rather than an ancestor. `relative z-10` on a nav label sitting on
   * a sliding pill is the author saying exactly that, and no ancestor walk can
   * see the pill. Measuring these produces confident nonsense, so they are
   * skipped and counted instead.
   */
  const isStacked = (cs) => cs.position !== 'static' && cs.zIndex !== 'auto' && Number(cs.zIndex) > 0;

  const contrast = [];
  const clipped = [];
  const seen = new Set();
  let stackedSkipped = 0;

  document.querySelectorAll('body *').forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if (el.closest('.sr-only') || el.classList.contains('sr-only')) return;

    let text = '';
    el.childNodes.forEach((n) => {
      if (n.nodeType === 3) text += n.nodeValue;
    });
    text = text.trim();

    if (text) {
      if (isStacked(cs)) {
        stackedSkipped += 1;
      } else {
        const fg = parse(cs.color);
        const bg = bgOf(el);
        if (fg) {
          const eff = fg.a < 1 ? over(fg, bg) : fg;
          const cr = ratio(eff, bg);
          const size = parseFloat(cs.fontSize);
          const weight = parseInt(cs.fontWeight, 10) || 400;
          const large = size >= 24 || (size >= 18.66 && weight >= 700);
          const need = large ? 3 : 4.5;
          if (cr < need) {
            const key = `${cs.color}|${text.slice(0, 24)}`;
            if (!seen.has(key)) {
              seen.add(key);
              contrast.push({
                text: text.slice(0, 46),
                color: cs.color,
                bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`,
                ratio: Number(cr.toFixed(2)),
                need,
                cls: (el.className.baseVal || el.className || '').toString().slice(0, 60),
              });
            }
          }
        }
      }
    }

    if (el.scrollWidth > el.clientWidth + 2 && cs.overflowX === 'visible' && el.clientWidth > 0 && !el.querySelector('table')) {
      clipped.push({
        tag: el.tagName,
        cls: (el.className.baseVal || el.className || '').toString().slice(0, 50),
        scrollW: el.scrollWidth,
        clientW: el.clientWidth,
      });
    }
  });

  const h = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((x) => Number(x.tagName[1]));
  let order = 'ok';
  for (let i = 1; i < h.length; i += 1) if (h[i] - h[i - 1] > 1) order = `jump h${h[i - 1]}->h${h[i]}`;

  const unnamed = [...document.querySelectorAll('button,a[href]')].filter((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    return !(el.textContent || '').trim() && !el.getAttribute('aria-label') && !el.getAttribute('title');
  }).length;

  return {
    url: location.pathname,
    h1: document.querySelectorAll('h1').length,
    headingOrder: order,
    unnamedControls: unnamed,
    hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    stackedSkipped,
    contrast: contrast.slice(0, 14),
    clipped: clipped.slice(0, 8),
  };
};
