(function () {
  if (window.__aiubSidebarEnhanced) return;
  window.__aiubSidebarEnhanced = true;

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function titleCase(str) {
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function getStudentName() {
    const el = document.querySelector('.navbar-text .navbar-link small') ||
               document.querySelector('.navbar-text .navbar-link');
    if (!el) return '';
    const raw = el.textContent.trim();
    const parts = raw.split(',').map((s) => s.trim());
    if (parts.length >= 2) return titleCase(parts[1]) + ' ' + titleCase(parts[0]);
    return titleCase(raw);
  }

  // ── Tailwind CSS Conversion: Sidebar styles now use Tailwind utilities ──────────
  // This function was used to load external CSS file
  // All styles have been converted to Tailwind classes and inline styles
  // CSS file is no longer needed
  /*
  function loadCSS() {
    if (document.getElementById('aiub-sidebar-style')) return;
    const link = document.createElement('link');
    link.id = 'aiub-sidebar-style';
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('Shared/Sidebar.css');
    document.head.appendChild(link);
  }
  */

    function cleanup() {
    const styleEl = document.getElementById('aiub-sidebar-style');
    if (styleEl) styleEl.remove();

    const sidebar = document.getElementById('navigation-bar');
    if (!sidebar) return;

    sidebar.querySelectorAll('.nav-profile-block, .nav-section-divider, .aiub-graph-nav-item').forEach((el) => el.remove());

    sidebar.querySelectorAll('.aiub-active-item').forEach((a) => {
      a.classList.remove('active', 'aiub-active-item');
    });

    sidebar.querySelectorAll('.aiub-open-collapse').forEach((collapse) => {
      collapse.classList.remove('in', 'aiub-open-collapse');
    });

    sidebar.querySelectorAll('.aiub-expanded-trigger').forEach((trigger) => {
      trigger.classList.remove('aria-expanded-true', 'aiub-expanded-trigger');
      trigger.setAttribute('aria-expanded', 'false');
    });
  }

  function enhance() {
    const sidebar = document.getElementById('navigation-bar');
    if (!sidebar) return;

    // loadCSS(); // ── Commented out: using Tailwind classes instead
    
    const name = getStudentName();
    const idEl = document.querySelector('.navbar-text .navbar-link small');
    const rawId = idEl ? idEl.textContent.trim() : '';
    const idMatch = rawId.match(/(\d{2}-\d{5}-\d+)/);
    const studentId = idMatch ? idMatch[1] : '';

    // ── Apply Tailwind styles to sidebar container ──────────────────────────────
    sidebar.style.cssText = 'padding-right: 12px !important; padding-left: 0 !important; padding-top: 4px !important;';

    // ── Style .panel-group with Tailwind ─────────────────────────────────────────
    const panelGroup = sidebar.querySelector('.panel-group');
    if (panelGroup) {
      panelGroup.style.cssText = `
        margin-bottom: 0 !important;
        border-radius: 12px !important;
        overflow: hidden !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
        background: linear-gradient(180deg, #f8fafc 0%, #e0e7ff 100%) !important;
      `;

      // ── Style .panel elements ────────────────────────────────────────────────────
      panelGroup.querySelectorAll('.panel').forEach((panel, idx) => {
        panel.style.cssText = `
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          margin-bottom: 0 !important;
          background: transparent !important;
          border-bottom: ${idx === panelGroup.children.length - 1 ? 'none' : '1px solid rgba(0, 0, 0, 0.05)'} !important;
        `;

        // ── Style .panel-heading ─────────────────────────────────────────────────────
        const heading = panel.querySelector('.panel-heading');
        if (heading) {
          heading.style.cssText = 'background: transparent !important; border: none !important; padding: 0 !important;';
          const title = heading.querySelector('.panel-title');
          if (title) title.style.fontSize = '13px !important';

          // ── Style heading link with Tailwind ────────────────────────────────────────
          const link = heading.querySelector('a');
          if (link) {
            link.style.cssText = `
              display: flex !important;
              align-items: center !important;
              gap: 10px !important;
              padding: 12px 14px !important;
              font-size: 12.5px !important;
              font-weight: 600 !important;
              color: #4b5563 !important;
              text-decoration: none !important;
              border-radius: 0 !important;
              transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
              background: transparent !important;
              position: relative !important;
            `;

            // ── Handle hover states ──────────────────────────────────────────────────
            link.addEventListener('mouseenter', function () {
              this.style.background = 'rgba(59, 130, 246, 0.1) !important';
              this.style.color = '#1d4ed8 !important';
              const fa = this.querySelector('.fa, .glyphicon');
              if (fa) fa.style.color = '#2563eb !important';
            });

            link.addEventListener('mouseleave', function () {
              const isExpanded = this.getAttribute('aria-expanded') === 'true';
              this.style.background = isExpanded ? 'rgba(37, 99, 235, 0.15) !important' : 'transparent !important';
              this.style.color = isExpanded ? '#1e3a8a !important' : '#4b5563 !important';
              const fa = this.querySelector('.fa, .glyphicon');
              if (fa) fa.style.color = isExpanded ? '#2563eb !important' : '#9ca3af !important';
            });

            // ── Style icon ──────────────────────────────────────────────────────────────
            const icon = link.querySelector('.fa, .glyphicon');
            if (icon) {
              icon.style.cssText = `
                font-size: 12px !important;
                color: #9ca3af !important;
                width: 16px !important;
                text-align: center !important;
                flex-shrink: 0 !important;
                transition: color 0.2s ease !important;
              `;
            }

            // ── Style caret icon ────────────────────────────────────────────────────────
            const caret = link.querySelector('.fa-caret-down');
            if (caret) {
              caret.style.cssText = `
                margin-left: auto !important;
                font-size: 10px !important;
                color: #d1d5db !important;
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                width: auto !important;
                flex-shrink: 0 !important;
              `;
            }

            // ── Handle aria-expanded state ──────────────────────────────────────────────
            const updateExpanded = () => {
              const isExpanded = link.getAttribute('aria-expanded') === 'true';
              if (isExpanded) {
                link.style.background = 'rgba(37, 99, 235, 0.15) !important';
                link.style.color = '#1e3a8a !important';
                link.classList.add('aria-expanded-true', 'aiub-expanded-trigger');
                const fa = link.querySelector('.fa, .glyphicon');
                if (fa) fa.style.color = '#2563eb !important';
                const caret = link.querySelector('.fa-caret-down');
                if (caret) {
                  caret.style.color = '#2563eb !important';
                  caret.style.transform = 'rotate(180deg) !important';
                }
              } else {
                link.style.background = 'transparent !important';
                link.style.color = '#4b5563 !important';
                link.classList.remove('aria-expanded-true', 'aiub-expanded-trigger');
                const fa = link.querySelector('.fa, .glyphicon');
                if (fa) fa.style.color = '#9ca3af !important';
                const caret = link.querySelector('.fa-caret-down');
                if (caret) {
                  caret.style.color = '#d1d5db !important';
                  caret.style.transform = 'rotate(0deg) !important';
                }
              }
            };
            updateExpanded();
            link.addEventListener('click', () => setTimeout(updateExpanded, 50));
          }
        }

        // ── Style .panel-collapse ────────────────────────────────────────────────────────
        const collapse = panel.querySelector('.panel-collapse');
        if (collapse) {
          collapse.style.cssText = 'border: none !important; background: transparent !important;';
          const collapseDiv = collapse.querySelector('div');
          if (collapseDiv) {
            collapseDiv.style.cssText = 'padding: 4px 8px 8px 8px !important;';
          }
        }
      });
    }

    // ── Style .list-group-item with Tailwind ────────────────────────────────────────
    sidebar.querySelectorAll('.list-group-item').forEach((item) => {
      item.style.cssText = `
        border: none !important;
        border-radius: 6px !important;
        background: transparent !important;
        padding: 9px 12px !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        color: #6b7280 !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
        text-decoration: none !important;
        line-height: 1.3 !important;
        margin: 0 !important;
        position: relative !important;
      `;

      // ── Hover state ──────────────────────────────────────────────────────────────────
      item.addEventListener('mouseenter', function () {
        if (!this.classList.contains('active')) {
          this.style.background = 'rgba(255, 255, 255, 0.6) !important';
          this.style.color = '#1e3a8a !important';
          this.style.paddingLeft = '16px !important';
          const glyphicon = this.querySelector('.glyphicon');
          if (glyphicon) glyphicon.style.color = '#2563eb !important';
        }
      });

      item.addEventListener('mouseleave', function () {
        if (!this.classList.contains('active')) {
          this.style.background = 'transparent !important';
          this.style.color = '#6b7280 !important';
          this.style.paddingLeft = '12px !important';
          const glyphicon = this.querySelector('.glyphicon');
          if (glyphicon) glyphicon.style.color = '#d1d5db !important';
        }
      });

      // ── Style glyphicon ──────────────────────────────────────────────────────────────
      const glyphicon = item.querySelector('.glyphicon');
      if (glyphicon) {
        glyphicon.style.cssText = `
          font-size: 11px !important;
          color: #d1d5db !important;
          flex-shrink: 0 !important;
          width: 14px !important;
          text-align: center !important;
          transition: color 0.15s ease !important;
        `;
      }
    });

    // ── Create or style profile block with Tailwind ──────────────────────────────────
    if (name && !sidebar.querySelector('.nav-profile-block')) {
      const profileDiv = document.createElement('div');
      profileDiv.className = 'nav-profile-block';
      profileDiv.style.cssText = `
        background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%) !important;
        border-radius: 10px !important;
        padding: 16px !important;
        margin-bottom: 12px !important;
        color: #fff !important;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25) !important;
        position: relative !important;
        overflow: hidden !important;
      `;

      const nameDiv = document.createElement('div');
      nameDiv.className = 'nav-profile-name';
      nameDiv.style.cssText = `
        font-size: 13px !important;
        font-weight: 700 !important;
        color: #fff !important;
        margin: 0 0 4px 0 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        line-height: 1.3 !important;
        position: relative !important;
        z-index: 1 !important;
        letter-spacing: -0.3px !important;
      `;
      nameDiv.textContent = name;
      profileDiv.appendChild(nameDiv);

      if (studentId) {
        const idDiv = document.createElement('div');
        idDiv.className = 'nav-profile-id';
        idDiv.style.cssText = `
          font-size: 11px !important;
          color: rgba(255, 255, 255, 0.75) !important;
          font-weight: 500 !important;
          letter-spacing: 0.4px !important;
          position: relative !important;
          z-index: 1 !important;
        `;
        idDiv.textContent = studentId;
        profileDiv.appendChild(idDiv);
      }

      sidebar.insertBefore(profileDiv, sidebar.firstChild);
    }

    // ── Mark active item ─────────────────────────────────────────────────────────────
    const path = window.location.pathname;
    sidebar.querySelectorAll('.list-group-item').forEach((a) => {
      try {
        const href = new URL(a.href).pathname;
        if (path.startsWith(href) && href !== '/Student') {
          a.classList.add('active', 'aiub-active-item');
          a.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important';
          a.style.color = '#fff !important';
          a.style.fontWeight = '600 !important';
          a.style.outline = 'none !important';
          a.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.3) !important';
          const glyphicon = a.querySelector('.glyphicon');
          if (glyphicon) glyphicon.style.color = 'rgba(255, 255, 255, 0.85) !important';
        }
      } catch (_) {}
    });

    // ── Add section dividers ─────────────────────────────────────────────────────────
    sidebar.querySelectorAll('.panel-group > .panel + .panel').forEach((panel) => {
      const prev = panel.previousElementSibling;
      if (!prev || !prev.classList || !prev.classList.contains('nav-section-divider')) {
        const divider = document.createElement('div');
        divider.className = 'nav-section-divider';
        divider.style.cssText = 'height: 6px !important; background: transparent !important; margin: 6px 0 !important;';
        panel.parentNode.insertBefore(divider, panel);
      }
    });
  }

  function tryEnhance() {
    if (document.getElementById('navigation-bar')) enhance();
    else setTimeout(tryEnhance, 150);
  }

  function applyEnabledState(enabled) {
    if (!enabled) {
      cleanup();
      return;
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryEnhance, { once: true });
    } else {
      tryEnhance();
    }
  }

  chrome.storage.sync.get({ extensionEnabled: true }, (r) => {
    applyEnabledState(Boolean(r && r.extensionEnabled));
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes.extensionEnabled) return;
    applyEnabledState(Boolean(changes.extensionEnabled.newValue));
    if (!changes.extensionEnabled.newValue) {
      cleanup();
    }
  });
})();
