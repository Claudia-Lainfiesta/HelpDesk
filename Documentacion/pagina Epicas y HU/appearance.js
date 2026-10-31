// Se ejecuta antes de pintar la página para restaurar la apariencia elegida.
(() => {
  const root = document.documentElement;
  const key = 'helpdesk-theme';
  const valid = value => value === 'light' || value === 'dark';
  let saved;
  try { saved = localStorage.getItem(key); } catch { /* La selección sigue funcionando sin almacenamiento. */ }
  let explicit = valid(saved);
  const system = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function apply(mode) {
    root.dataset.theme = mode;
    document.querySelectorAll('[data-set-theme]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.setTheme === mode));
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = mode === 'dark' ? '#0a1222' : '#09285f';
  }
  apply(explicit ? saved : system?.matches ? 'dark' : 'light');
  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.theme);
    document.querySelectorAll('[data-set-theme]').forEach(button => {
      button.addEventListener('click', () => {
        const mode = button.dataset.setTheme;
        if (!valid(mode)) return;
        explicit = true;
        apply(mode);
        try { localStorage.setItem(key, mode); } catch { /* Preferencia solo para esta visita. */ }
      });
    });
  });
  const followSystem = event => { if (!explicit) apply(event.matches ? 'dark' : 'light'); };
  if (system?.addEventListener) system.addEventListener('change', followSystem);
  // Mantener coherentes las pestañas abiertas del mismo sitio.
  window.addEventListener('storage', event => {
    if (event.key !== key) return;
    explicit = valid(event.newValue);
    apply(explicit ? event.newValue : system?.matches ? 'dark' : 'light');
  });
})();
