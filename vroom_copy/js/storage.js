/* ============================================================
   VROOMIIIES — storage.js
   Wrapper localStorage blindé (try/catch partout).
   Clés : vroomiiies.options / vroomiiies.records / vroomiiies.champions / vroomiiies.version
   ============================================================ */
'use strict';

const STORAGE_KEYS = {
  options: 'vroomiiies.options',
  records: 'vroomiiies.records',
  champions: 'vroomiiies.champions',
  version: 'vroomiiies.version'
};

const CIRCUIT_IDS = ['prairie', 'plage', 'gouter', 'potager', 'salledebain', 'banquise', 'nuit', 'nuages'];
const KART_VALUES = [8, 12, 16, 22, 30];
const TOUR_VALUES = [1, 2, 3, 5];
const DIFFICULTIES = ['facile', 'normal', 'expert'];
const CHARACTER_IDS = ['mimi', 'pixel', 'boubou', 'ziggy', 'louna', 'coco'];

function pickOne(value, allowed, fallback) {
  return allowed.indexOf(value) !== -1 ? value : fallback;
}

const DEFAULT_OPTIONS = {
  son: true,
  difficulte: 'normal',   // 'facile' | 'normal' | 'expert'
  joueurs: 1,             // 1 | 2 (2 joueurs : lot 5)
  karts: 30,              // nombre total de karts sur la grille (dont joueurs)
  tours: 3,
  circuit: 'prairie',
  persoP1: 'mimi',
  persoP2: 'pixel'
};

const Storage = {
  load: function (key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('[storage] lecture impossible pour', key, e);
      return fallback;
    }
  },
  save: function (key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('[storage] écriture impossible pour', key, e);
      return false;
    }
  },

  defaultRecords: function () {
    const rec = {};
    for (let i = 0; i < CIRCUIT_IDS.length; i++) rec[CIRCUIT_IDS[i]] = { best: null, bestLap: null };
    return rec;
  },

  /* Charge les options en comblant les clés manquantes avec les défauts,
     puis borne/whiteliste chaque valeur (données localStorage non fiables). */
  loadOptions: function () {
    const stored = this.load(STORAGE_KEYS.options, {}) || {};
    const opts = {};
    for (const k in DEFAULT_OPTIONS) opts[k] = (stored[k] !== undefined ? stored[k] : DEFAULT_OPTIONS[k]);
    opts.son = typeof opts.son === 'boolean' ? opts.son : DEFAULT_OPTIONS.son;
    opts.difficulte = pickOne(opts.difficulte, DIFFICULTIES, DEFAULT_OPTIONS.difficulte);
    opts.joueurs = (opts.joueurs === 1 || opts.joueurs === 2) ? opts.joueurs : DEFAULT_OPTIONS.joueurs;
    opts.karts = pickOne(opts.karts, KART_VALUES, DEFAULT_OPTIONS.karts);
    opts.tours = pickOne(opts.tours, TOUR_VALUES, DEFAULT_OPTIONS.tours);
    opts.circuit = pickOne(opts.circuit, CIRCUIT_IDS, DEFAULT_OPTIONS.circuit);
    opts.persoP1 = pickOne(opts.persoP1, CHARACTER_IDS, DEFAULT_OPTIONS.persoP1);
    opts.persoP2 = pickOne(opts.persoP2, CHARACTER_IDS, DEFAULT_OPTIONS.persoP2);
    return opts;
  },
  saveOptions: function (opts) { return this.save(STORAGE_KEYS.options, opts); },

  /* Records : garantit les 8 clés circuits */
  loadRecords: function () {
    const stored = this.load(STORAGE_KEYS.records, {}) || {};
    const rec = this.defaultRecords();
    for (const id of CIRCUIT_IDS) {
      if (stored[id] && typeof stored[id] === 'object') {
        rec[id] = {
          best: (typeof stored[id].best === 'number') ? stored[id].best : null,
          bestLap: (typeof stored[id].bestLap === 'number') ? stored[id].bestLap : null
        };
      }
    }
    return rec;
  },
  saveRecords: function (records) { return this.save(STORAGE_KEYS.records, records); },

  loadChampions: function () {
    const c = this.load(STORAGE_KEYS.champions, []);
    return Array.isArray(c) ? c : [];
  },
  saveChampions: function (list) { return this.save(STORAGE_KEYS.champions, list); },

  /* À appeler au boot : crée les clés manquantes */
  ensure: function () {
    if (this.load(STORAGE_KEYS.version, null) !== '1') this.save(STORAGE_KEYS.version, '1');
    const opts = this.loadOptions(); this.saveOptions(opts);
    const rec = this.loadRecords(); this.saveRecords(rec);
    const champ = this.loadChampions(); this.saveChampions(champ);
  }
};
