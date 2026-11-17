/* Vroomiiies — persistance : localStorage avec repli mémoire silencieux */
(function (root) {
  'use strict';
  var V = root.V = root.V || {};

  var PREFIX = 'vroomiiies.v1.';
  var memo = Object.create(null);   // repli mémoire
  var ls = null;

  try {
    ls = root.localStorage;
    var k = PREFIX + 'test';
    ls.setItem(k, '1');
    ls.removeItem(k);
  } catch (e) {
    ls = null; // mode privé / file:// restreint : repli silencieux
  }

  // assainit : que des primitives/objets simples, taille bornée
  function sanitize(val) {
    if (val === null || val === undefined) return null;
    var t = typeof val;
    if (t === 'number') return isFinite(val) ? val : null;
    if (t === 'string') return val.length <= 4000 ? val : null;
    if (t === 'boolean') return val;
    if (t === 'object') {
      var out = {};
      var n = 0;
      for (var key in val) {
        if (!Object.prototype.hasOwnProperty.call(val, key)) continue;
        var v = sanitize(val[key]);
        if (v !== null) { out[key] = v; if (++n > 200) break; }
      }
      return out;
    }
    return null;
  }

  var store = {
    get: function (key, def) {
      try {
        var raw = ls ? ls.getItem(PREFIX + key) : memo[PREFIX + key];
        if (raw == null) return def;
        var val = JSON.parse(raw);
        var clean = sanitize(val);
        return clean === null ? def : clean;
      } catch (e) { return def; }
    },
    set: function (key, val) {
      try {
        var clean = sanitize(val);
        var raw = JSON.stringify(clean === null ? null : clean);
        if (ls) ls.setItem(PREFIX + key, raw);
        else memo[PREFIX + key] = raw;
        return true;
      } catch (e) { return false; }
    },
    del: function (key) {
      try {
        if (ls) ls.removeItem(PREFIX + key);
        else delete memo[PREFIX + key];
      } catch (e) { /* silencieux */ }
    },
    // Isolation : vide toutes nos clés
    clearAll: function () {
      try {
        if (ls) {
          var toDel = [];
          for (var i = 0; i < ls.length; i++) {
            var k2 = ls.key(i);
            if (k2 && k2.indexOf(PREFIX) === 0) toDel.push(k2);
          }
          for (var j = 0; j < toDel.length; j++) ls.removeItem(toDel[j]);
        }
        for (var m in memo) delete memo[m];
      } catch (e) { /* silencieux */ }
    }
  };

  V.store = store;
})(typeof window !== 'undefined' ? window : globalThis);
