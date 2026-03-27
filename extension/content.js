(() => {
  'use strict';

  const BADGE_CLASS = 'bcfi-field-badge';
  const BADGE_PART_CLASS = 'bcfi-part-badge';
  const STATUS_CLASS = 'bcfi-status';
  let isEnabled = false;
  let isBcPage = false;
  let observer = null;

  // ── BC Detection ──────────────────────────────────────────────────

  function detectBcPage() {
    const url = window.location.href;
    const params = new URL(url).searchParams;
    const hasPageParam = params.has('page') || params.has('Page');

    if (/businesscentral\.dynamics\.com|bc\.dynamics\.com/i.test(url)) { isBcPage = true; return true; }
    if (document.title.includes('Business Central')) { isBcPage = true; return true; }
    if (document.querySelector('[class*="ms-nav"]')) { isBcPage = true; return true; }
    if (hasPageParam && /\/BC\w*\//i.test(url)) { isBcPage = true; return true; }
    if (hasPageParam && (params.has('company') || params.has('Company') ||
        params.has('tenant') || params.has('dc') || params.has('bookmark'))) { isBcPage = true; return true; }

    isBcPage = false;
    return false;
  }

  // ── Initialization ──────────────────────────────────────────────────

  setTimeout(() => {
    if (!detectBcPage()) return;
    console.log('[BC Field Inspector] BC page detected!');
    chrome.storage.local.get({ enabled: false }, (s) => { if (s.enabled) enable(); });
  }, 2000);

  chrome.runtime.onMessage.addListener((msg) => {
    if (!isBcPage) detectBcPage();
    if (msg.action === 'enable') enable();
    if (msg.action === 'disable') disable();
    if (msg.action === 'refresh') { removeBadges(); applyBadges(); }
  });

  function enable() {
    isEnabled = true;
    if (!isBcPage) { showStatus('BC Field Inspector: Not a Business Central page'); return; }
    applyBadges();
    startObserver();
  }

  function disable() {
    isEnabled = false;
    removeBadges();
    removeStatus();
    stopObserver();
  }

  // ── Control classification ──────────────────────────────────────────

  function isPartOrGroup(el) {
    const cls = el.className || '';
    // Container types: FactBoxes, card/list parts, bands/groups
    if (cls.includes('cardpart') || cls.includes('listpart') ||
        cls.includes('factbox') || cls.includes('FactBox') ||
        cls.includes('ms-nav-band')) return true;
    // If it contains multiple child controls, it's a container
    const children = el.querySelectorAll(':scope > [controlname], :scope > * > [controlname]');
    if (children.length > 0) return true;
    return false;
  }

  // ── Badge injection ─────────────────────────────────────────────────

  function applyBadges() {
    if (!isEnabled || !isBcPage) return;
    removeBadges();

    const controls = document.querySelectorAll('[controlname]');
    let matched = 0;
    let skipped = 0;

    // Process from deepest to shallowest so child controls get badged before parents
    const sorted = Array.from(controls).sort((a, b) => {
      return getDepth(b) - getDepth(a);
    });

    sorted.forEach(el => {
      const name = (el.getAttribute('controlname') || '').trim();
      if (!name) return;

      // Skip only truly hidden controls (display:none or explicitly hidden class)
      const cls = el.className || '';
      if (cls.includes('ms-nav-hidden') || el.style.display === 'none') {
        skipped++;
        return;
      }

      // Skip if this element or its label area already has a badge
      if (el.querySelector('.' + BADGE_CLASS) || el.querySelector('.' + BADGE_PART_CLASS)) return;

      const isPart = isPartOrGroup(el);
      const target = findBadgeTarget(el, isPart);
      if (!target) return;

      // Ensure target doesn't already have a badge
      if (target.querySelector && (
          target.querySelector('.' + BADGE_CLASS) ||
          target.querySelector('.' + BADGE_PART_CLASS))) return;

      const badge = document.createElement('span');
      badge.className = isPart ? BADGE_PART_CLASS : BADGE_CLASS;
      badge.textContent = name;
      badge.title = `Click to copy: ${name}`;
      badge.style.cursor = 'pointer';
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        navigator.clipboard.writeText(name).then(() => {
          const orig = badge.textContent;
          badge.textContent = 'Copied!';
          badge.style.backgroundColor = '#4caf50';
          setTimeout(() => {
            badge.textContent = orig;
            badge.style.backgroundColor = '';
          }, 800);
        });
      });

      // Append badge to the controlname container element (not the caption)
      // and ensure it has position:relative for absolute badge positioning
      const container = el;
      const style = window.getComputedStyle(container);
      if (style.position === 'static') {
        container.style.position = 'relative';
      }
      container.appendChild(badge);
      matched++;
    });

    console.log('[BC Field Inspector]', controls.length, 'controls,', matched, 'badged,', skipped, 'hidden');
    if (matched > 0) showStatus(`BC Field Inspector: ${matched} fields`);
    else if (controls.length === 0) showStatus('BC Field Inspector: No controls found. Try Refresh.');
  }

  function getDepth(el) {
    let depth = 0;
    let node = el;
    while (node.parentElement) { depth++; node = node.parentElement; }
    return depth;
  }

  function findBadgeTarget(el, isPart) {
    // ── For parts/groups: find the section header ──
    if (isPart) {
      // Collapsible headers (FastTabs)
      let header = el.querySelector('[class*="collapsibleTab"] > a, [class*="caption-header"]');
      if (header) return header;
      // Part title area
      header = el.querySelector(':scope > [class*="caption"], :scope > a, :scope > div > a');
      if (header && header.textContent.trim()) return header;
      // First heading
      for (const h of el.querySelectorAll('h1, h2, h3, h4')) {
        if (h.closest('[controlname]') === el) return h;
      }
      return el;
    }

    // ── For field controls: find the caption element ──

    // 1. <a> with "caption" in class (most common BC pattern)
    let caption = el.querySelector('a[class*="caption"]');
    if (caption) return caption;

    // 2. <a> with role="button" that's a caption (not a value link)
    for (const a of el.querySelectorAll('a[role="button"]')) {
      const cls = a.className || '';
      if (!cls.includes('value') && !cls.includes('stringcontrol') &&
          !cls.includes('edit') && a.textContent.trim()) {
        return a;
      }
    }

    // 3. <label> element
    let label = el.querySelector('label');
    if (label) return label;

    // 4. Any <a> element that looks like a caption (has text, no inputs inside)
    for (const a of el.querySelectorAll('a')) {
      const cls = a.className || '';
      if (cls.includes('value') || cls.includes('stringcontrol') || cls.includes('edit')) continue;
      const text = a.textContent.trim();
      if (text && text.length < 100 && !a.querySelector('input, select, textarea')) return a;
    }

    // 5. <span> that looks like a caption (not a value/read span)
    for (const span of el.querySelectorAll('span')) {
      const cls = span.className || '';
      if (cls.includes('value') || cls.includes('stringcontrol') ||
          cls.includes('read') || cls.includes('edit-container') ||
          cls.includes('button')) continue;
      const text = span.textContent.trim();
      if (text && text.length > 0 && text.length < 100 &&
          !span.querySelector('input, select, textarea, .' + BADGE_CLASS)) {
        return span;
      }
    }

    // 6. Fallback: insert directly into the control element
    // Create a wrapper so the badge appears at the start
    return el;
  }

  // ── Observer ────────────────────────────────────────────────────────

  function startObserver() {
    if (observer) return;
    let debounceTimer;
    observer = new MutationObserver((mutations) => {
      // Check if new controlname elements were added
      let hasNewControls = false;
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) {
            if (node.hasAttribute && node.hasAttribute('controlname')) { hasNewControls = true; break; }
            if (node.querySelector && node.querySelector('[controlname]')) { hasNewControls = true; break; }
          }
        }
        if (hasNewControls) break;
      }
      if (!hasNewControls) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (isEnabled && isBcPage) applyBadges();
      }, 500);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    let lastUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        if (isEnabled) { removeBadges(); detectBcPage(); applyBadges(); }
      }
    }, 1000);
  }

  function stopObserver() {
    if (observer) { observer.disconnect(); observer = null; }
  }

  // ── UI ──────────────────────────────────────────────────────────────

  function removeBadges() {
    document.querySelectorAll('.' + BADGE_CLASS + ', .' + BADGE_PART_CLASS).forEach(el => el.remove());
  }

  function showStatus(text) {
    removeStatus();
    const el = document.createElement('div');
    el.className = STATUS_CLASS;
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(removeStatus, 4000);
  }

  function removeStatus() {
    document.querySelectorAll('.' + STATUS_CLASS).forEach(el => el.remove());
  }
})();
