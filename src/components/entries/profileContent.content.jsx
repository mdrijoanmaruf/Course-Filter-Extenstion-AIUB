(function () {
  if (window.__aiubProfileEnhanced) return;
  window.__aiubProfileEnhanced = true;

  function cleanup() {
    const mainContent = document.querySelector('#main-content');
    if (mainContent) {
      const enhanced = mainContent.querySelector('.aiub-profile-enhanced');
      if (enhanced) enhanced.remove();
    }
  }

  function enhance() {
    const mainContent = document.querySelector('#main-content');
    if (!mainContent) return;

    // Check if already enhanced
    if (mainContent.querySelector('.aiub-profile-enhanced')) return;

    // Mark as enhanced
    mainContent.classList.add('aiub-profile-enhanced');

    // Style the main content container
    mainContent.style.cssText = `
      background: linear-gradient(180deg, #f8fafc 0%, #e0e7ff 100%) !important;
      border-radius: 12px !important;
      padding: 24px !important;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
      margin-bottom: 20px !important;
    `;

    // Style the margin5 div
    const margin5 = mainContent.querySelector('.margin5');
    if (margin5) {
      margin5.style.cssText = `
        background: transparent !important;
        padding: 0 !important;
      `;
    }

    // Style the form
    const form = mainContent.querySelector('form');
    if (form) {
      form.style.cssText = `
        background: transparent !important;
      `;
    }

    // Style fieldset
    const fieldset = mainContent.querySelector('fieldset');
    if (fieldset) {
      fieldset.style.cssText = `
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        background: transparent !important;
      `;

      // Style legend
      const legend = fieldset.querySelector('legend');
      if (legend) {
        legend.style.cssText = `
          font-size: 24px !important;
          font-weight: 800 !important;
          color: #0f172a !important;
          margin-bottom: 24px !important;
          padding-bottom: 16px !important;
          border-bottom: 2px solid rgba(255, 255, 255, 0.3) !important;
          font-family: system-ui,-apple-system,sans-serif !important;
          width: 100% !important;
        `;
      }
    }

    // Style the main row
    const row = mainContent.querySelector('.row');
    if (row) {
      row.style.cssText = `
        gap: 20px !important;
      `;
    }

    // Style left column (table)
    const leftCol = mainContent.querySelector('.col-md-8');
    if (leftCol) {
      leftCol.style.cssText = `
        background: rgba(255, 255, 255, 0.7) !important;
        border-radius: 10px !important;
        padding: 20px !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06) !important;
      `;

      // Style the intro div if present
      const intro = leftCol.querySelector('[style*="margin-bottom"]');
      if (intro) {
        intro.style.cssText = `
          margin-bottom: 20px !important;
          padding-bottom: 16px !important;
          border-bottom: 2px solid #e2e8f0 !important;
          font-family: system-ui,-apple-system,sans-serif !important;
        `;
      }

      // Style table
      const table = leftCol.querySelector('.table');
      if (table) {
        table.style.cssText = `
          margin-bottom: 0 !important;
          font-family: system-ui,-apple-system,sans-serif !important;
          border-collapse: collapse !important;
        `;

        // Style table rows and cells
        table.querySelectorAll('tr').forEach((tr, idx) => {
          tr.style.cssText = `
            border-bottom: 1px solid #e2e8f0 !important;
            background: transparent !important;
          `;
          if (idx % 2 === 0) {
            tr.style.background = 'transparent !important';
          }

          // Style cells
          tr.querySelectorAll('td').forEach((td, cellIdx) => {
            td.style.cssText = `
              padding: 12px 14px !important;
              font-size: 13px !important;
              color: #374151 !important;
              font-weight: 500 !important;
              vertical-align: middle !important;
              border: none !important;
            `;

            // Style label cells (right aligned)
            if (cellIdx === 0 && td.textContent.trim()) {
              td.style.cssText += `
                color: #1e3a8a !important;
                font-weight: 600 !important;
                width: 30% !important;
                text-align: right !important;
                padding-right: 16px !important;
              `;
            } else {
              td.style.cssText += `
                color: #6b7280 !important;
                text-align: left !important;
              `;
            }

            // Remove existing inline styles but keep our new ones
            if (td.textContent.trim() === '') {
              td.style.height = '8px !important';
              td.style.paddingTop = '4px !important';
              td.style.paddingBottom = '4px !important';
            }
          });
        });
      }
    }

    // Style right column (image)
    const rightCol = mainContent.querySelector('.col-md-4');
    if (rightCol) {
      rightCol.style.cssText = `
        display: flex !important;
        align-items: flex-start !important;
        justify-content: center !important;
      `;

      const img = rightCol.querySelector('img');
      if (img) {
        img.style.cssText = `
          max-width: 100% !important;
          height: auto !important;
          border-radius: 10px !important;
          box-shadow: 0 4px 12px rgba(30, 58, 138, 0.15) !important;
          border: 2px solid rgba(255, 255, 255, 0.5) !important;
          object-fit: cover !important;
        `;
      }
    }

    // Style h2 headings
    mainContent.querySelectorAll('h2').forEach(h2 => {
      h2.style.cssText = `
        font-size: 22px !important;
        font-weight: 800 !important;
        color: #0f172a !important;
        margin: 0 0 4px 0 !important;
        line-height: 1.3 !important;
        font-family: system-ui,-apple-system,sans-serif !important;
      `;
    });

    // Style paragraphs
    mainContent.querySelectorAll('p').forEach(p => {
      p.style.cssText = `
        font-size: 13px !important;
        color: #94a3b8 !important;
        margin: 0 !important;
        font-family: system-ui,-apple-system,sans-serif !important;
      `;
    });
  }

  function tryEnhance() {
    if (document.querySelector('#main-content')) enhance();
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
