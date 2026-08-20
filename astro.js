/* astro.js — kalender- og himmelmekanikk for «Hvorfor er det ikke fredag».
   Ingen avhengigheter. Alle vinkler i grader ut, radianer internt. */

var Astro = (function () {
  var RAD = Math.PI / 180;
  function grad(r) { return r / RAD; }
  function mod360(x) { return ((x % 360) + 360) % 360; }

  /* ---------- Kalender ---------- */

  // Julianske dagnummer (heltall). JDN mod 7: 0=mandag, 4=fredag.
  function julianskDagnummer(aar, maaned, dag) {
    var a = Math.floor((14 - maaned) / 12);
    var y = aar + 4800 - a;
    var m = maaned + 12 * a - 3;
    return dag + Math.floor((153 * m + 2) / 5) + 365 * y
         + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  }

  // Julianske dato som desimaltall, brukt i solberegningene.
  function julianskDato(dato) { return dato.getTime() / 86400000 + 2440587.5; }

  // Zellers kongruens. 0=lørdag, 1=søndag ... 6=fredag.
  function zeller(aar, maaned, dag) {
    var y = aar, m = maaned;
    if (m < 3) { m += 12; y -= 1; }
    var K = y % 100, J = Math.floor(y / 100);
    return (dag + Math.floor(13 * (m + 1) / 5) + K + Math.floor(K / 4)
            + Math.floor(J / 4) + 5 * J) % 7;
  }

  function erSkuddaar(aar) {
    return (aar % 4 === 0 && aar % 100 !== 0) || aar % 400 === 0;
  }

  function dagerIAaret(aar) { return erSkuddaar(aar) ? 366 : 365; }

  // Regnes i UTC. Med lokale datoer blir differansen én time for kort etter
  // overgangen til sommertid, og dagnummeret dermed én for lavt.
  function dagIAaret(dato) {
    var start = Date.UTC(dato.getFullYear(), 0, 1);
    var naa = Date.UTC(dato.getFullYear(), dato.getMonth(), dato.getDate());
    return Math.round((naa - start) / 86400000) + 1;
  }

  // ISO 8601 ukenummer.
  function isoUke(dato) {
    var d = new Date(dato.getFullYear(), dato.getMonth(), dato.getDate());
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    var nyttaar = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d - nyttaar) / 86400000 + 1) / 7);
  }

  // ISO ukedag: 1=mandag ... 7=søndag.
  function isoUkedag(dato) { return dato.getDay() === 0 ? 7 : dato.getDay(); }

  function midnatt(dato) {
    return new Date(dato.getFullYear(), dato.getMonth(), dato.getDate()).getTime();
  }

  /* ---------- Sola (NOAA-algoritmen) ---------- */

  function solparametre(jd) {
    var T = (jd - 2451545.0) / 36525.0;
    var L0 = mod360(280.46646 + T * (36000.76983 + T * 0.0003032));
    var M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
    var e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
    var C = Math.sin(M * RAD) * (1.914602 - T * (0.004817 + 0.000014 * T))
          + Math.sin(2 * M * RAD) * (0.019993 - 0.000101 * T)
          + Math.sin(3 * M * RAD) * 0.000289;
    var sannLengde = L0 + C;
    var omega = 125.04 - 1934.136 * T;
    var lambda = sannLengde - 0.00569 - 0.00478 * Math.sin(omega * RAD);
    var eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
    var eps = eps0 + 0.00256 * Math.cos(omega * RAD);
    var deklinasjon = grad(Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD)));
    var y = Math.pow(Math.tan(eps / 2 * RAD), 2);
    var tidsligning = 4 * grad(
        y * Math.sin(2 * L0 * RAD)
      - 2 * e * Math.sin(M * RAD)
      + 4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD)
      - 0.5 * y * y * Math.sin(4 * L0 * RAD)
      - 1.25 * e * e * Math.sin(2 * M * RAD));
    return { deklinasjon: deklinasjon, tidsligning: tidsligning };
  }

  // Solhøyde over horisonten og asimut (0=nord, 90=øst, 180=sør).
  function solposisjon(dato, lat, lon) {
    var jd = julianskDato(dato);
    var p = solparametre(jd);
    var minutterUTC = (jd + 0.5 - Math.floor(jd + 0.5)) * 1440;
    var sanntid = (minutterUTC + p.tidsligning + 4 * lon) % 1440;
    if (sanntid < 0) sanntid += 1440;
    var timevinkel = sanntid / 4 - 180;

    var b = lat * RAD, d = p.deklinasjon * RAD, h = timevinkel * RAD;
    var sinHoyde = Math.sin(b) * Math.sin(d) + Math.cos(b) * Math.cos(d) * Math.cos(h);
    var hoyde = grad(Math.asin(Math.max(-1, Math.min(1, sinHoyde))));

    var zenit = (90 - hoyde) * RAD;
    var nevner = Math.cos(b) * Math.sin(zenit);
    var asimut = 180;
    if (Math.abs(nevner) > 1e-9) {
      var c = (Math.sin(b) * Math.cos(zenit) - Math.sin(d)) / nevner;
      var v = grad(Math.acos(Math.max(-1, Math.min(1, c))));
      asimut = timevinkel > 0 ? mod360(v + 180) : mod360(540 - v);
    }
    return { hoyde: hoyde, asimut: asimut, deklinasjon: p.deklinasjon };
  }

  // Soloppgang og solnedgang som Date, eller null ved midnattssol/mørketid.
  function soltider(aar, maaned, dag, lat, lon) {
    var jd = julianskDagnummer(aar, maaned, dag) - 0.5 + 0.5 - lon / 360;
    var p = solparametre(jd);
    var d = p.deklinasjon * RAD, b = lat * RAD;
    var uttrykk = Math.cos(90.833 * RAD) / (Math.cos(b) * Math.cos(d)) - Math.tan(b) * Math.tan(d);
    if (uttrykk > 1 || uttrykk < -1) return { oppgang: null, nedgang: null };
    var ha = grad(Math.acos(uttrykk));
    var basis = Date.UTC(aar, maaned - 1, dag);
    return {
      oppgang: new Date(basis + (720 - 4 * (lon + ha) - p.tidsligning) * 60000),
      nedgang: new Date(basis + (720 - 4 * (lon - ha) - p.tidsligning) * 60000)
    };
  }

  /* ---------- Månen ---------- */

  var SYNODISK = 29.530588853;
  var NYMAANE = Date.UTC(2000, 0, 6, 18, 14);

  function maanefase(dato) {
    var alder = ((dato.getTime() - NYMAANE) / 86400000) % SYNODISK;
    if (alder < 0) alder += SYNODISK;
    return {
      alder: alder,
      opplyst: (1 - Math.cos(2 * Math.PI * alder / SYNODISK)) / 2
    };
  }

  return {
    julianskDagnummer: julianskDagnummer,
    julianskDato: julianskDato,
    zeller: zeller,
    erSkuddaar: erSkuddaar,
    dagerIAaret: dagerIAaret,
    dagIAaret: dagIAaret,
    isoUke: isoUke,
    isoUkedag: isoUkedag,
    midnatt: midnatt,
    solposisjon: solposisjon,
    soltider: soltider,
    maanefase: maanefase
  };
})();

if (typeof module !== 'undefined') { module.exports = Astro; }
