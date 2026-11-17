/* Vroomiiies — utilitaires purs (node-loadable, sans DOM) */
(function (root) {
  'use strict';
  var V = root.V = root.V || {};
  var U = {};

  U.TAU = Math.PI * 2;

  U.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  // amortissement exponentiel indépendant du framerate
  U.damp = function (a, b, lambda, dt) { return a + (b - a) * (1 - Math.exp(-lambda * dt)); };

  U.randInt = function (a, b) { return a + ((Math.random() * (b - a + 1)) | 0); };
  U.choice = function (arr) { return arr[(Math.random() * arr.length) | 0]; };

  // PRNG déterministe (mulberry32) — décors, placements, skills IA
  U.seeded = function (seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.hashSeed = function (str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };

  U.dist2 = function (x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; };
  U.dist = function (x1, y1, x2, y2) { return Math.sqrt(U.dist2(x1, y1, x2, y2)); };

  // ramène un angle dans ]-PI, PI]
  U.wrapAngle = function (a) {
    a = a % U.TAU;
    if (a > Math.PI) a -= U.TAU;
    if (a <= -Math.PI) a += U.TAU;
    return a;
  };

  // 0:12.34
  U.fmtTime = function (ms) {
    if (!isFinite(ms) || ms < 0) ms = 0;
    var total = Math.floor(ms);
    var min = Math.floor(total / 60000);
    var sec = Math.floor((total % 60000) / 1000);
    var cs = Math.floor((total % 1000) / 10);;
    return min + ':' + (sec < 10 ? '0' : '') + sec + '.' + (cs < 10 ? '0' : '') + cs;
  };

  // 1 -> "1er", 2 -> "2e"
  U.ordinal = function (n) { return n === 1 ? '1er' : n + 'e'; };

  U.now = function () { return (root.performance && root.performance.now) ? root.performance.now() : Date.now(); };

  V.U = U;
})(typeof window !== 'undefined' ? window : globalThis);
