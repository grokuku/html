/* ================================================================
   VROOMIIIES — menu-kit.js
   Briques partagées par les menus Course libre & Championnat :
   steppers « − valeur + », onglets de difficulté, colonnes joueur
   (avatar + flèches ◀ ▶ + nom/description).
   =============================================================== */
'use strict';

const MenuKit = (function () {

  function valuesIndex(values, v) { const i = values.indexOf(v); return i < 0 ? 0 : i; }

  /* Stepper générique : values = liste des valeurs cyclées. */
  function wireStepper(rootId, values, getValue, setValue, format, onChange) {
    const root = document.getElementById(rootId);
    if (!root) return { refresh: function () {} };
    const valEl = root.querySelector('.step-value');
    function render() { valEl.textContent = format(getValue()); }
    function step(dir) {
      const i = valuesIndex(values, getValue());
      const next = values[(i + dir + values.length) % values.length];
      setValue(next);
      render();
      AudioSys.sfx.click();
      if (onChange) onChange(next);
    }
    root.querySelector('[data-dir="-1"]').addEventListener('click', function () { step(-1); });
    root.querySelector('[data-dir="1"]').addEventListener('click', function () { step(1); });
    render();
    return { refresh: render };
  }

  /* Onglets de difficulté (Facile / Normal / Expert) */
  function wireDifficulty(rootId, getValue, setValue, onChange) {
    const root = document.getElementById(rootId);
    if (!root) return { refresh: function () {} };
    const tabs = Array.prototype.slice.call(root.querySelectorAll('.diff-tab'));
    function render() {
      const cur = getValue();
      for (const t of tabs) t.classList.toggle('active', t.dataset.diff === cur);
    }
    for (const t of tabs) {
      t.addEventListener('click', function () {
        setValue(t.dataset.diff);
        render();
        AudioSys.sfx.click();
        if (onChange) onChange(t.dataset.diff);
      });
    }
    render();
    return { refresh: render };
  }

  /* Colonne joueur : avatar + flèches + nom + blurb + hint.
     prefix = préfixe des ids DOM (ex. 'libreP1') ; key = 'persoP1'|'persoP2' */
  function renderPlayerColumn(prefix, opts, key) {
    const charId = opts[key];
    const ch = CHARACTERS[charId] || CHARACTERS.mimi;
    const head = document.getElementById(prefix + 'Head');
    const canvas = document.getElementById(prefix + 'Avatar');
    const blurb = document.getElementById(prefix + 'Blurb');
    const idx = prefix.endsWith('P2') ? 2 : 1;
    if (head) head.innerHTML = 'Joueur ' + idx + ' · <strong>' + escapeHtml(ch.name) + '</strong>';
    if (canvas && typeof drawAvatar === 'function') drawAvatar(canvas, charId, 132, { disc: true });
    if (blurb) blurb.textContent = ch.blurb;
  }

  function cycleChar(opts, key, dir) {
    const ids = CHARACTER_LIST.map(function (c) { return c.id; });
    const i = valuesIndex(ids, opts[key]);
    opts[key] = ids[(i + dir + ids.length) % ids.length];
    return opts[key];
  }

  const FORMAT = {
    joueurs: function (v) { return v === 1 ? '1 joueur' : '2 joueurs'; },
    karts: function (v) { return String(v); },
    tours: function (v) { return v === 1 ? '1 tour' : v + ' tours'; }
  };
  const VALUES = {
    joueurs: [1, 2],
    karts: [8, 12, 16, 22, 30],
    tours: [1, 2, 3, 5]
  };

  return { wireStepper: wireStepper, wireDifficulty: wireDifficulty, renderPlayerColumn: renderPlayerColumn, cycleChar: cycleChar, FORMAT: FORMAT, VALUES: VALUES };
})();
