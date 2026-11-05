/* ==========================================================
   Générateur de CV – logique (JavaScript natif, sans bibliothèque)
   Formulaire (data-field) → aperçu (data-out), listes répétables,
   sauvegarde localStorage, impression.
   ========================================================== */
(function () {
  'use strict';

  var STORAGE_KEY = 'cv-interactif-v1';
  var PHOTO_MAX = 400; // px, pour limiter le poids dans localStorage

  var form = document.getElementById('cv-form');
  var sheet = document.getElementById('cv');
  var avatar = sheet.querySelector('[data-out-photo]');
  var avatarDefault = avatar.innerHTML;

  var photoData = '';
  var saveTimer = null;

  /* ---------- Outils ---------- */
  function $all(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }

  function inList(el, attr) { return !!el.closest('[' + attr + ']'); }

  function safeUrl(value) {
    var v = (value || '').trim();
    if (!v) return '';
    if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = 'https://' + v;
    try {
      var u = new URL(v);
      return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '';
    } catch (e) { return ''; }
  }

  function hrefFor(key, value) {
    var v = (value || '').trim();
    if (!v) return '';
    if (key === 'email') return /^[^@\s]+@[^@\s]+$/.test(v) ? 'mailto:' + v : '';
    if (key === 'telephone') {
      var digits = v.replace(/[^\d+]/g, '');
      return digits ? 'tel:' + digits : '';
    }
    return safeUrl(v);
  }

  /* ---------- Modèles (capturés avant tout remplissage) ---------- */
  var formLists = {};   // nom → { el, template, initial, label }
  var previewLists = {}; // nom → { el, template }

  $all(form, '[data-list]').forEach(function (el) {
    var name = el.getAttribute('data-list');
    var first = el.querySelector(':scope > .entry');
    var tpl = first.cloneNode(true);
    $all(tpl, 'input, textarea').forEach(function (f) { f.value = ''; });
    tpl.removeAttribute('open');
    formLists[name] = {
      el: el,
      template: tpl,
      initial: el.querySelectorAll(':scope > .entry').length,
      label: first.querySelector('summary').textContent.replace(/\s*\d+\s*$/, '')
    };
  });

  $all(sheet, '[data-preview-list]').forEach(function (el) {
    var name = el.getAttribute('data-preview-list');
    previewLists[name] = { el: el, template: el.firstElementChild.cloneNode(true) };
  });

  /* ---------- Lecture du formulaire ---------- */
  function readFields(scope, excludeLists) {
    var data = {};
    $all(scope, '[data-field]').forEach(function (f) {
      if (f.type === 'file') return;
      if (excludeLists && inList(f, 'data-list')) return;
      data[f.getAttribute('data-field')] = f.value;
    });
    return data;
  }

  function readState() {
    var state = { fields: readFields(form, true), lists: {}, photo: photoData };
    Object.keys(formLists).forEach(function (name) {
      state.lists[name] = $all(formLists[name].el, ':scope > .entry').map(function (entry) {
        return readFields(entry, false);
      });
    });
    return state;
  }

  /* ---------- Rendu de l'aperçu ---------- */
  function fillScope(scope, data, topLevel) {
    var skip = function (el) { return topLevel && inList(el, 'data-preview-list'); };

    $all(scope, '[data-out]').forEach(function (el) {
      if (skip(el)) return;
      if (el.dataset.def === undefined) el.dataset.def = el.textContent;
      var v = (data[el.getAttribute('data-out')] || '').trim();
      el.textContent = v || el.dataset.def;
      el.classList.toggle('is-empty', !v); // valeur par défaut = masquée à l'impression
    });

    $all(scope, '[data-out-href]').forEach(function (el) {
      if (skip(el)) return;
      if (el.dataset.defHref === undefined) el.dataset.defHref = el.getAttribute('href') || '';
      var key = el.getAttribute('data-out-href');
      el.setAttribute('href', hrefFor(key, data[key]) || el.dataset.defHref);
    });

    $all(scope, '[data-out-badges]').forEach(function (ul) {
      if (skip(ul)) return;
      if (ul.dataset.defBadges === undefined) ul.dataset.defBadges = ul.innerHTML;
      var items = (data[ul.getAttribute('data-out-badges')] || '')
        .split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      ul.classList.toggle('is-empty', !items.length);
      if (!items.length) { ul.innerHTML = ul.dataset.defBadges; return; }
      ul.textContent = '';
      items.forEach(function (t) {
        var li = document.createElement('li');
        var m = /^(.*?)\s*:\s*(\d{1,3})\s*%?$/.exec(t); // « Nom:80 » → barre de niveau
        if (m && m[1]) {
          var lvl = Math.min(100, +m[2]);
          li.className = 'lvl';
          li.style.setProperty('--lvl', lvl + '%');
          li.textContent = m[1] + ' · ' + lvl + ' %';
        } else li.textContent = t;
        ul.appendChild(li);
      });
    });
  }

  function renderPhoto() {
    if (!photoData) {
      avatar.innerHTML = avatarDefault;
      avatar.setAttribute('role', 'img');
      avatar.setAttribute('aria-label', 'Emplacement de la photo de profil');
      return;
    }
    var name = (form.querySelector('[data-field="nom"]').value || '').trim();
    var img = document.createElement('img');
    img.src = photoData;
    img.alt = name ? 'Photo de ' + name : 'Photo de profil';
    avatar.textContent = '';
    avatar.removeAttribute('role');
    avatar.removeAttribute('aria-label');
    avatar.appendChild(img);
  }

  function renderLists(state) {
    Object.keys(previewLists).forEach(function (name) {
      var pl = previewLists[name];
      var rows = state.lists[name] || [];
      while (pl.el.children.length < rows.length) pl.el.appendChild(pl.template.cloneNode(true));
      while (pl.el.children.length > rows.length) pl.el.removeChild(pl.el.lastElementChild);
      rows.forEach(function (row, i) { fillScope(pl.el.children[i], row, false); });
    });
  }

  // Marque (is-empty) les blocs sans aucune valeur saisie ; le CSS d'impression les masque
  function markEmpty() {
    avatar.classList.toggle('is-empty', !photoData);
    $all(sheet, '.contact li, .card, .timeline__item, .section, .sheet__footer, .meta-org, .meta-org > span, .meta-date, .achievements, .link-more, .more').forEach(function (u) {
      u.classList.toggle('is-empty', !u.querySelector('[data-out]:not(.is-empty), [data-out-badges]:not(.is-empty)'));
    });
  }

  function render() {
    var state = readState();
    fillScope(sheet, state.fields, true);
    renderPhoto();
    renderLists(state);
    markEmpty();
    return state;
  }

  /* ---------- Sauvegarde ---------- */
  function save(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* stockage indisponible ou plein */ }
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { save(readState()); }, 250);
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) { return null; }
  }

  /* ---------- Listes répétables (formulaire) ---------- */
  function renumber(name) {
    var fl = formLists[name];
    $all(fl.el, ':scope > .entry').forEach(function (entry, i) {
      entry.querySelector('summary').textContent = fl.label + ' ' + (i + 1);
    });
  }

  function addEntry(name, open) {
    var fl = formLists[name];
    var entry = fl.template.cloneNode(true);
    if (open) entry.setAttribute('open', '');
    fl.el.insertBefore(entry, fl.el.querySelector(':scope > [data-action="add"]'));
    renumber(name);
    return entry;
  }

  function ensureCount(name, n) {
    var fl = formLists[name];
    var entries = $all(fl.el, ':scope > .entry');
    for (var i = entries.length; i < n; i++) addEntry(name, false);
    for (var j = entries.length - 1; j >= n && j >= 0; j--) fl.el.removeChild(entries[j]);
    renumber(name);
  }

  /* ---------- Application d'un état sauvegardé ---------- */
  function applyState(state) {
    if (!state) return;
    var fields = state.fields || {};
    $all(form, '[data-field]').forEach(function (f) {
      if (f.type === 'file' || inList(f, 'data-list')) return;
      var k = f.getAttribute('data-field');
      if (typeof fields[k] === 'string') f.value = fields[k];
    });
    Object.keys(formLists).forEach(function (name) {
      var rows = (state.lists && state.lists[name]) || null;
      if (!Array.isArray(rows)) return;
      ensureCount(name, Math.max(rows.length, 1));
      $all(formLists[name].el, ':scope > .entry').forEach(function (entry, i) {
        var row = rows[i] || {};
        $all(entry, '[data-field]').forEach(function (f) {
          var v = row[f.getAttribute('data-field')];
          f.value = typeof v === 'string' ? v : '';
        });
      });
    });
    photoData = (typeof state.photo === 'string' && /^data:image\//.test(state.photo)) ? state.photo : '';
  }

  /* ---------- Photo ---------- */
  function handlePhoto(file) {
    if (!file || !/^image\//.test(file.type)) { photoData = ''; refresh(); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, PHOTO_MAX / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        photoData = c.toDataURL('image/jpeg', 0.85);
        refresh();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  /* ---------- Événements ---------- */
  function refresh() { save(render()); }

  form.addEventListener('input', function (e) {
    if (e.target.type === 'file') return;
    render();
    scheduleSave();
  });

  form.addEventListener('change', function (e) {
    if (e.target.type === 'file') handlePhoto(e.target.files[0]);
  });

  form.addEventListener('submit', function (e) { e.preventDefault(); });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');

    if (action === 'add') {
      var name = btn.getAttribute('data-target');
      var entry = addEntry(name, true);
      var first = entry.querySelector('input, textarea');
      if (first) first.focus();
      refresh();
    } else if (action === 'remove') {
      var entryEl = btn.closest('.entry');
      var listEl = entryEl.parentElement;
      var listName = listEl.getAttribute('data-list');
      if (listEl.querySelectorAll(':scope > .entry').length > 1) {
        listEl.removeChild(entryEl);
        renumber(listName);
      } else {
        $all(entryEl, 'input, textarea').forEach(function (f) { f.value = ''; });
      }
      refresh();
    } else if (action === 'toggle-all') {
      var ds = $all(document.getElementById(btn.getAttribute('data-target')), 'details.more');
      var openAll = ds.some(function (d) { return !d.open; });
      ds.forEach(function (d) { d.open = openAll; });
      btn.textContent = openAll ? 'Tout replier' : 'Tout déplier';
    } else if (action === 'theme') {
      var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('cv-theme', next); } catch (err) { /* ignoré */ }
    } else if (action === 'print') {
      window.print();
    } else if (action === 'reset') {
      if (!window.confirm('Effacer toutes les informations saisies ?')) return;
      try { localStorage.removeItem(STORAGE_KEY); } catch (err) { /* ignoré */ }
      form.reset();
      photoData = '';
      Object.keys(formLists).forEach(function (n) { ensureCount(n, formLists[n].initial); });
      render();
    }
  });

  /* ---------- Compétences : filtres par catégorie + barres animées au scroll ---------- */
  var skillGrid = document.querySelector('#competences .grid');
  var cards = $all(skillGrid, '.card');
  var bar = document.createElement('div');
  bar.className = 'filters';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Filtrer les compétences par catégorie');
  [['Tout', null]].concat(cards.map(function (c) { return [c.querySelector('h3').textContent, c]; })).forEach(function (p, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = p[0];
    b.setAttribute('aria-pressed', i === 0);
    b.addEventListener('click', function () {
      $all(bar, 'button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      cards.forEach(function (c) { c.hidden = !!p[1] && c !== p[1]; });
    });
    bar.appendChild(b);
  });
  skillGrid.parentNode.insertBefore(bar, skillGrid);

  // .seen sur la carte (nœud stable) : les barres ne se rejouent pas à chaque frappe
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('seen'); io.unobserve(en.target); }
      });
    }, { threshold: 0.3 });
    cards.forEach(function (c) { io.observe(c); });
  } else cards.forEach(function (c) { c.classList.add('seen'); });

  // impression : les <details> fermés cacheraient leur contenu
  var wasOpen = [];
  window.addEventListener('beforeprint', function () {
    wasOpen = $all(sheet, 'details.more').filter(function (d) { return !d.open; });
    wasOpen.forEach(function (d) { d.open = true; });
  });
  window.addEventListener('afterprint', function () { wasOpen.forEach(function (d) { d.open = false; }); });

  /* ---------- Initialisation ---------- */
  applyState(load());
  render();
})();
