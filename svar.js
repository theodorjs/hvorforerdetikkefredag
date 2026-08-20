/* svar.js — bygger konteksten og velger dagens svar.
   Krever astro.js. Alle svar skal tåle å bli faktasjekket. */

var Svar = (function () {

  /* ---------- Ordlister ---------- */

  var UKEDAG = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];

  var TILHORER = {
    'mandag':  'mens mandag tilhører månen',
    'tirsdag': 'mens tirsdag tilhører krigsguden Ty',
    'onsdag':  'mens onsdag tilhører Odin',
    'torsdag': 'mens torsdag tilhører Tor',
    'lørdag':  'mens lørdag ikke tilhører noen gud i det hele tatt. Laugardagr var norrønt for vaskedag',
    'søndag':  'mens søndag tilhører sola'
  };

  var TALLORD = ['null', 'én', 'to', 'tre', 'fire', 'fem', 'seks', 'sju'];

  var LATIN = {
    'mandag': 'dies Lunae', 'tirsdag': 'dies Martis', 'onsdag': 'dies Mercurii',
    'torsdag': 'dies Iovis', 'fredag': 'dies Veneris', 'lørdag': 'dies Saturni',
    'søndag': 'dies Solis'
  };

  // Representative steder, fra østligste til vestligste tidssone.
  var STEDER = [
    { tz: 'Pacific/Kiritimati',  frase: 'på Kiritimati i Kiribati' },
    { tz: 'Pacific/Apia',        frase: 'i Apia i Samoa' },
    { tz: 'Pacific/Auckland',    frase: 'i Auckland på New Zealand' },
    { tz: 'Pacific/Noumea',      frase: 'i Nouméa i Ny-Caledonia' },
    { tz: 'Australia/Sydney',    frase: 'i Sydney i Australia' },
    { tz: 'Asia/Tokyo',          frase: 'i Tokyo i Japan' },
    { tz: 'Asia/Seoul',          frase: 'i Seoul i Sør-Korea' },
    { tz: 'Asia/Shanghai',       frase: 'i Shanghai i Kina' },
    { tz: 'Asia/Jakarta',        frase: 'i Jakarta i Indonesia' },
    { tz: 'Asia/Bangkok',        frase: 'i Bangkok i Thailand' },
    { tz: 'Asia/Dhaka',          frase: 'i Dhaka i Bangladesh' },
    { tz: 'Asia/Kathmandu',      frase: 'i Kathmandu i Nepal' },
    { tz: 'Asia/Kolkata',        frase: 'i Kolkata i India' },
    { tz: 'Asia/Karachi',        frase: 'i Karachi i Pakistan' },
    { tz: 'Asia/Dubai',          frase: 'i Dubai i De forente arabiske emirater' },
    { tz: 'Europe/Moscow',       frase: 'i Moskva i Russland' },
    { tz: 'Africa/Nairobi',      frase: 'i Nairobi i Kenya' },
    { tz: 'Europe/Oslo',         frase: 'i Oslo' },
    { tz: 'Europe/Berlin',       frase: 'i Berlin i Tyskland' },
    { tz: 'Africa/Lagos',        frase: 'i Lagos i Nigeria' },
    { tz: 'Europe/London',       frase: 'i London i Storbritannia' },
    { tz: 'Atlantic/Reykjavik',  frase: 'i Reykjavík på Island' },
    { tz: 'Atlantic/Cape_Verde', frase: 'i Praia på Kapp Verde' },
    { tz: 'America/Sao_Paulo',   frase: 'i São Paulo i Brasil' },
    { tz: 'America/Argentina/Buenos_Aires', frase: 'i Buenos Aires i Argentina' },
    { tz: 'America/Santiago',    frase: 'i Santiago i Chile' },
    { tz: 'America/New_York',    frase: 'i New York i USA' },
    { tz: 'America/Mexico_City', frase: 'i Mexico by' },
    { tz: 'America/Chicago',     frase: 'i Chicago i USA' },
    { tz: 'America/Denver',      frase: 'i Denver i USA' },
    { tz: 'America/Los_Angeles', frase: 'i Los Angeles i USA' },
    { tz: 'America/Anchorage',   frase: 'i Anchorage i Alaska' },
    { tz: 'Pacific/Honolulu',    frase: 'i Honolulu på Hawaii' },
    { tz: 'Pacific/Gambier',     frase: 'på Gambier i Fransk Polynesia' },
    { tz: 'Pacific/Niue',        frase: 'i Alofi på Niue' }
  ];

  var OSLO_LAT = 59.9139, OSLO_LON = 10.7522;
  var BANEFART = 29.78;            // km/s, jordas fart rundt sola
  var CESIUM = 9192631770;         // svingninger per sekund, definisjonen av sekundet

  /* ---------- Formatering ---------- */

  function tall(x, d) {
    return new Intl.NumberFormat('nb-NO', {
      minimumFractionDigits: d, maximumFractionDigits: d
    }).format(x);
  }
  function heltall(x) {
    return new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(x);
  }
  // Én desimal under ti, ingen over. «13 timer» leser bedre enn «13,0 timer».
  function pentTall(x) { return x >= 10 ? tall(Math.round(x), 0) : tall(x, 1); }
  function stortTall(x) {
    if (x >= 1e15) return tall(x / 1e15, 2) + ' billiarder';
    if (x >= 1e12) return tall(x / 1e12, 2) + ' billioner';
    if (x >= 1e9)  return tall(x / 1e9, 2) + ' milliarder';
    if (x >= 1e6)  return tall(x / 1e6, 2) + ' millioner';
    return heltall(x);
  }
  function klokke(dato, tz) {
    var valg = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
    if (tz) valg.timeZone = tz;
    return new Intl.DateTimeFormat('nb-NO', valg).format(dato).replace(':', '.');
  }
  function datoTekst(dato) {
    return new Intl.DateTimeFormat('nb-NO', {
      day: 'numeric', month: 'long', year: 'numeric'
    }).format(dato);
  }

  /* ---------- Tidssoner ---------- */

  function deler(dato, tz) {
    var s = new Intl.DateTimeFormat('sv-SE', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(dato);
    var m = s.match(/(\d{4})-(\d{2})-(\d{2})\D+(\d{2}):(\d{2}):(\d{2})/);
    return {
      aar: +m[1], maaned: +m[2], dag: +m[3],
      time: +m[4], minutt: +m[5], sekund: +m[6],
      ukedag: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()
    };
  }
  function offsetTimer(dato, tz) {
    var d = deler(dato, tz);
    var som = Date.UTC(d.aar, d.maaned - 1, d.dag, d.time, d.minutt, d.sekund);
    return Math.round((som - Math.floor(dato.getTime() / 1000) * 1000) / 60000) / 60;
  }
  // Millisekunder til neste fredag kl. 00.00 i sonen. Negativt tall = fredagen pågår.
  function msTilFredagI(dato, tz) {
    var d = deler(dato, tz);
    var brukt = ((d.time * 60 + d.minutt) * 60 + d.sekund) * 1000;
    if (d.ukedag === 5) return -brukt;
    return ((5 - d.ukedag + 7) % 7) * 86400000 - brukt;
  }

  /* ---------- Konteksten ---------- */

  function byggKontekst(naa) {
    var n = {};
    naa = naa || new Date();
    n.naa = naa;

    n.ukedagNr = naa.getDay();
    n.ukedag = UKEDAG[n.ukedagNr];
    n.erFredag = n.ukedagNr === 5;
    n.aar = naa.getFullYear();

    var midnattIdag = Astro.midnatt(naa);
    n.msSidenMidnatt = naa.getTime() - midnattIdag;

    // Nærmeste fredag framover og forrige fredags slutt.
    var dagerTil = (5 - n.ukedagNr + 7) % 7;
    if (dagerTil === 0) dagerTil = 7;
    n.nesteFredag = new Date(midnattIdag + dagerTil * 86400000);
    n.msTilFredag = n.nesteFredag - naa;
    n.netterTilFredag = dagerTil;

    var dagerSiden = (n.ukedagNr - 6 + 7) % 7;   // døgn siden lørdag 00.00, altså fredagens slutt
    n.forrigeFredagSlutt = new Date(midnattIdag - dagerSiden * 86400000);
    n.msSidenFredag = naa - n.forrigeFredagSlutt;
    n.forrigeFredagStart = new Date(n.forrigeFredagSlutt.getTime() - 86400000);

    if (n.erFredag) {
      n.msIFredag = n.msSidenMidnatt;
      n.msIgjenAvFredag = 86400000 - n.msSidenMidnatt;
    }

    // Uka, regnet fra mandag 00.00
    var sidenMandag = (n.ukedagNr + 6) % 7;
    n.ukeprosent = ((sidenMandag * 86400000 + n.msSidenMidnatt) / (7 * 86400000)) * 100;

    // Kalendertall
    n.jdn = Astro.julianskDagnummer(naa.getFullYear(), naa.getMonth() + 1, naa.getDate());
    n.jdnMod7 = n.jdn % 7;
    n.unixSek = Math.floor(naa.getTime() / 1000);
    n.unixDagerMod7 = Math.floor(n.unixSek / 86400) % 7;
    n.zeller = Astro.zeller(naa.getFullYear(), naa.getMonth() + 1, naa.getDate());
    n.isoUke = Astro.isoUke(naa);
    n.isoUkedag = Astro.isoUkedag(naa);
    n.dagIAaret = Astro.dagIAaret(naa);
    n.dagerIAaret = Astro.dagerIAaret(n.aar);

    // Fredager i året, og hvor mange som gjenstår
    var fredager = 0, fredagerIgjen = 0;
    for (var d = new Date(n.aar, 0, 1); d.getFullYear() === n.aar; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 5) { fredager++; if (d.getTime() > midnattIdag) fredagerIgjen++; }
    }
    n.fredagerIAaret = fredager;
    n.fredagerIgjen = fredagerIgjen;

    // Neste fredag den 13.
    var f13 = new Date(midnattIdag);
    for (var i = 0; i < 4000; i++) {
      if (f13.getDate() === 13 && f13.getDay() === 5 && f13.getTime() > midnattIdag) break;
      f13.setDate(f13.getDate() + 1);
    }
    n.nesteFredag13 = f13;

    // Skuddår siden 1900, og hvilken ukedag det hadde vært uten dem
    var skudd = 0;
    for (var y = 1900; y <= n.aar; y++) {
      if (Astro.erSkuddaar(y) && new Date(y, 1, 29).getTime() <= midnattIdag) skudd++;
    }
    n.skuddaar = skudd;
    n.skuddforskyvning = skudd % 7;
    n.ukedagUtenSkuddaar = UKEDAG[((n.ukedagNr - n.skuddforskyvning) % 7 + 7) % 7];

    // 400-årssyklusen
    n.datoFor400 = new Date(naa.getTime());
    n.datoFor400.setFullYear(n.aar - 400);

    // Sola og månen i Oslo
    n.sol = Astro.solposisjon(naa, OSLO_LAT, OSLO_LON);
    var osloDag = deler(naa, 'Europe/Oslo');
    n.soltider = Astro.soltider(osloDag.aar, osloDag.maaned, osloDag.dag, OSLO_LAT, OSLO_LON);
    n.solOppe = n.sol.hoyde > 0;
    n.maane = Astro.maanefase(naa);

    // Jordas bevegelse
    n.graderTilFredag = (n.msTilFredag / 86400000) * 360;
    n.graderSidenFredag = ((naa - n.forrigeFredagStart) / 86400000) * 360;
    n.kmSidenFredag = BANEFART * ((naa - n.forrigeFredagStart) / 1000);
    n.kmSidenMidnatt = BANEFART * (n.msSidenMidnatt / 1000);
    n.jordomlop = (n.msTilFredag / 86400000) * (86400 / 86164.0905);

    // Steder rundt om i verden
    n.stederMedFredag = [];
    n.stederUtenFredag = [];
    STEDER.forEach(function (s) {
      var d = deler(naa, s.tz);
      var post = { frase: s.frase, tz: s.tz, klokke: klokke(naa, s.tz), offset: offsetTimer(naa, s.tz) };
      if (d.ukedag === 5) n.stederMedFredag.push(post); else n.stederUtenFredag.push(post);
    });
    n.egenOffset = offsetTimer(naa, Intl.DateTimeFormat().resolvedOptions().timeZone);
    n.msTilFredagKiritimati = msTilFredagI(naa, 'Pacific/Kiritimati');
    n.msTilFredagNiue = msTilFredagI(naa, 'Pacific/Niue');
    n.kiritimatiIFredag = deler(naa, 'Pacific/Kiritimati').ukedag === 5;
    n.niueIFredag = deler(naa, 'Pacific/Niue').ukedag === 5;
    n.egetSted = egetSted();

    return n;
  }

  function egetSted() {
    var tz;
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { tz = null; }
    if (!tz) return 'der du er';
    for (var i = 0; i < STEDER.length; i++) if (STEDER[i].tz === tz) return STEDER[i].frase;
    return 'i ' + tz.split('/').pop().replace(/_/g, ' ');
  }

  /* ---------- Hjelpere til svartekstene ---------- */

  function varighet(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var t = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return { timer: t, minutter: m, sekunder: r };
  }
  // Entall og flertall, slik at det aldri står «1 timer».
  function enhet(x, entall, flertall) { return x + ' ' + (x === 1 ? entall : flertall); }

  // Full nedtelling. Utelater ledd som er null, slik at det ikke står «0 timer».
  function nedtelling(ms) {
    var v = varighet(ms);
    var ledd = [];
    if (v.timer) ledd.push(enhet(v.timer, 'time', 'timer'));
    if (v.minutter) ledd.push(enhet(v.minutter, 'minutt', 'minutter'));
    if (v.sekunder || !ledd.length) ledd.push(enhet(v.sekunder, 'sekund', 'sekunder'));
    return ledd.length === 1 ? ledd[0] : ledd.slice(0, -1).join(', ') + ' og ' + ledd[ledd.length - 1];
  }
  // Lange spenn leses som døgn, korte som timer og minutter.
  function varighetTekst(ms) {
    if (ms >= 48 * 3600000) {
      var dogn = Math.floor(ms / 86400000);
      var rest = Math.round((ms % 86400000) / 3600000);
      if (rest === 24) { dogn += 1; rest = 0; }
      return rest ? enhet(dogn, 'døgn', 'døgn') + ' og ' + enhet(rest, 'time', 'timer')
                  : enhet(dogn, 'døgn', 'døgn');
    }
    return timerOgMinutter(ms);
  }
  function timerOgMinutter(ms) {
    var v = varighet(ms);
    if (!v.timer) return enhet(v.minutter, 'minutt', 'minutter');
    if (!v.minutter) return enhet(v.timer, 'time', 'timer');
    return enhet(v.timer, 'time', 'timer') + ' og ' + enhet(v.minutter, 'minutt', 'minutter');
  }
  function tilfeldig(liste) { return liste[Math.floor(Math.random() * liste.length)]; }

  /* ---------- Svarbanken ---------- */

  var BANK = [

    /* A. Geografi og tidssoner */
    { id: 'A1', gruppe: 'geografi', fredag: false,
      gyldig: function (n) { return n.stederMedFredag.length > 0; },
      tekst: function (n) { return 'Fordi du ikke er ' + tilfeldig(n.stederMedFredag).frase + '. Der er det fredag akkurat nå.'; } },

    { id: 'A2', gruppe: 'geografi', fredag: false,
      gyldig: function (n) { return n.kiritimatiIFredag; },
      tekst: function (n) {
        return 'Fordi fredagen begynte i Kiribati for ' + varighetTekst(-msTilFredagI(n.naa, 'Pacific/Kiritimati'))
             + ' siden og beveger seg vestover med én tidssone i timen. Den har ikke nådd deg.';
      } },

    { id: 'A3', gruppe: 'geografi', fredag: false,
      gyldig: function (n) { return n.msTilFredagKiritimati > 0; },
      tekst: function (n) { return 'Fordi Kiritimati i Kiribati alltid får fredag først. Der begynner den om ' + varighetTekst(n.msTilFredagKiritimati) + '.'; } },

    { id: 'A4', gruppe: 'geografi', fredag: false,
      gyldig: function (n) {
        return n.stederMedFredag.some(function (s) { return s.offset > n.egenOffset; });
      },
      tekst: function (n) {
        var diff = n.stederMedFredag
          .filter(function (s) { return s.offset > n.egenOffset; })
          .map(function (s) { return s.offset - n.egenOffset; })
          .sort(function (a, b) { return a - b; })[0];
        return 'Fordi du måtte reist ' + enhet(Math.round(diff), 'time', 'timer') + ' østover for å finne fredag.';
      } },

    { id: 'A5', gruppe: 'geografi', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi datolinja ligger midt i Stillehavet, og du er på feil side av den.'; } },

    { id: 'A6', gruppe: 'geografi', fredag: false,
      gyldig: function (n) { return n.stederMedFredag.length === 0; },
      tekst: function () { return 'Fordi en fredag finnes et sted på jorda i 49 timer i strekk, og akkurat nå er den ikke i gang noe sted.'; } },

    { id: 'A7', gruppe: 'geografi', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi Samoa strøk fredag 30. desember 2011 fra kalenderen da de byttet side av datolinja. De gikk fra torsdag rett til lørdag.'; } },

    { id: 'A8', gruppe: 'geografi', fredag: false,
      gyldig: function (n) { return n.stederUtenFredag.length > 0; },
      tekst: function (n) { var s = tilfeldig(n.stederUtenFredag); return 'Fordi klokka er ' + s.klokke + ' ' + s.frase + ', og heller ikke der er det fredag.'; } },

    /* B. Nedtelling */
    { id: 'A9', gruppe: 'geografi', fredag: false,
      gyldig: function (n) { return !n.kiritimatiIFredag && n.niueIFredag; },
      tekst: function (n) { return 'Fordi fredagen er på vei ut av verden vestover. Den er allerede over i Kiribati, og om ' + varighetTekst(86400000 + n.msTilFredagNiue) + ' er den helt borte fra jorda.'; } },

    { id: 'B1', gruppe: 'nedtelling', fredag: false,
      gyldig: function (n) { return n.msSidenFredag >= 43200000; },
      tekst: function (n) { return 'Fordi det var fredag for ' + tall(n.msSidenFredag / 86400000, 2) + ' dager siden.'; } },

    { id: 'B2', gruppe: 'nedtelling', fredag: false, gyldig: null,
      tekst: function (n) { return 'Fordi det er fredag om ' + tall(n.msTilFredag / 86400000, 2) + ' dager.'; } },

    { id: 'B3', gruppe: 'nedtelling', fredag: false,
      gyldig: function (n) { return n.msTilFredag < 48 * 3600000; },
      tekst: function (n) { return 'Fordi det er ' + nedtelling(n.msTilFredag) + ' igjen til fredag.'; } },

    { id: 'B4', gruppe: 'nedtelling', fredag: false, gyldig: null,
      tekst: function (n) {
        var s = Math.floor(n.msTilFredag / 1000);
        return 'Fordi det er ' + heltall(s) + ' sekunder til fredag, og ' + heltall(s) + ' er større enn null.';
      } },

    { id: 'B5', gruppe: 'nedtelling', fredag: false, gyldig: null,
      tekst: function (n) { return 'Fordi du må sove ' + enhet(n.netterTilFredag, 'gang', 'ganger') + ' til.'; } },

    { id: 'B6', gruppe: 'nedtelling', fredag: false, gyldig: null,
      tekst: function (n) { return 'Fordi ' + tall(n.ukeprosent, 1) + ' prosent av uka har gått, og fredag begynner ved 57,1 prosent.'; } },

    { id: 'B7', gruppe: 'nedtelling', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi bare 14,29 prosent av alle dager er fredag. I dag havnet du blant de resterende 85,71 prosentene.'; } },

    /* C. Jordas bevegelse */
    { id: 'C1', gruppe: 'jorda', fredag: false, gyldig: null,
      tekst: function (n) { return 'Fordi jorda må rotere ' + tall(n.graderTilFredag, 0) + ' grader til om sin egen akse før det blir fredag.'; } },

    { id: 'C2', gruppe: 'jorda', fredag: false, gyldig: null,
      tekst: function (n) { return 'Fordi jorda har rotert ' + tall(n.graderSidenFredag, 0) + ' grader siden forrige fredag begynte.'; } },

    { id: 'C3', gruppe: 'jorda', fredag: false, gyldig: null,
      tekst: function (n) { return 'Fordi jorda har flyttet seg ' + tall(n.kmSidenFredag / 1e6, 1) + ' millioner kilometer i banen rundt sola siden forrige fredag, og det holder ikke.'; } },

    { id: 'C4', gruppe: 'jorda', fredag: false,
      gyldig: function (n) { return n.msSidenMidnatt > 3600000; },
      tekst: function (n) { return 'Fordi jorda har reist ' + heltall(n.kmSidenMidnatt) + ' kilometer gjennom rommet siden midnatt, uten å komme nærmere fredag.'; } },

    { id: 'C5', gruppe: 'jorda', fredag: false,
      gyldig: function (n) { return n.jordomlop >= 0.25; },
      tekst: function (n) { return 'Fordi én omdreining om jordaksen tar 23 timer, 56 minutter og 4,1 sekunder, og du trenger ' + tall(n.jordomlop, 2) + ' til.'; } },

    { id: 'C6', gruppe: 'jorda', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi Oslo snurrer rundt jordaksen i 839 kilometer i timen, og selv det er for sakte. Ved ekvator er farten 1 674.'; } },

    /* D. Sola og månen */
    { id: 'D1', gruppe: 'himmelen', fredag: false,
      gyldig: function (n) { return n.solOppe; },
      tekst: function (n) { return 'Fordi sola står ' + tall(n.sol.hoyde, 1) + ' grader over horisonten i Oslo akkurat nå, i asimut ' + tall(n.sol.asimut, 0) + ' grader. Nøyaktig som den skal på en ' + n.ukedag + '.'; } },

    { id: 'D2', gruppe: 'himmelen', fredag: false,
      gyldig: function (n) { return !n.solOppe; },
      tekst: function (n) { return 'Fordi sola er ' + tall(Math.abs(n.sol.hoyde), 1) + ' grader under horisonten i Oslo akkurat nå, og må opp og ned igjen ' + enhet(n.netterTilFredag, 'gang', 'ganger') + '.'; } },

    { id: 'D3', gruppe: 'himmelen', fredag: false, gyldig: null,
      tekst: function (n) { return 'Fordi sola må gå ned og opp igjen ' + enhet(n.netterTilFredag, 'gang', 'ganger') + ' før det blir fredag.'; } },

    { id: 'D4', gruppe: 'himmelen', fredag: false,
      gyldig: function (n) { return n.soltider.oppgang && n.soltider.nedgang; },
      tekst: function (n) { return 'Fordi sola sto opp ' + klokke(n.soltider.oppgang, 'Europe/Oslo') + ' og går ned ' + klokke(n.soltider.nedgang, 'Europe/Oslo') + ' i Oslo i dag, og ingen av delene gjør det til fredag.'; } },

    { id: 'D5', gruppe: 'himmelen', fredag: false, gyldig: null,
      tekst: function (n) { return 'Fordi månen er ' + tall(n.maane.opplyst * 100, 0) + ' prosent opplyst og ' + tall(n.maane.alder, 1) + ' døgn inn i syklusen sin. Månen bryr seg ikke om uker.'; } },

    { id: 'D6', gruppe: 'himmelen', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi månemåneden er 29,53 døgn og ikke går opp i sju.'; } },

    { id: 'D7', gruppe: 'himmelen', fredag: false,
      gyldig: function (n) { return n.solOppe; },
      tekst: function () { return 'Fordi lyset som treffer deg nå forlot sola for 8 minutter og 20 sekunder siden. Det var ikke fredag da heller.'; } },

    /* E. Kalenderhistorie */
    { id: 'E1', gruppe: 'historie', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi Julius Cæsar innførte den julianske kalenderen i år 46 fvt. Den bygde på solåret med 365,25 dager, med skuddår hvert fjerde år.'; } },
    { id: 'E2', gruppe: 'historie', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi pave Gregor XIII justerte den julianske kalenderen i år 1582.'; } },
    { id: 'E3', gruppe: 'historie', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi da ti dager forsvant fra kalenderen i oktober 1582, gikk ukedagene uforstyrret videre: torsdag 4. oktober ble etterfulgt av fredag 15. oktober.'; } },
    { id: 'E4', gruppe: 'historie', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi Danmark-Norge gikk over til den gregorianske kalenderen i 1700 og hoppet fra 18. februar rett til 1. mars, uten å røre ukedagene.'; } },
    { id: 'E5', gruppe: 'historie', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi det julianske året var elleve minutter for langt. Siden kirkemøtet i Nikea i år 325 hadde feilen vokst til ti dager, og de ble strøket i 1582.'; } },
    { id: 'E6', gruppe: 'historie', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi det gregorianske året bommer med 26 sekunder i året. Det tar 3 300 år før det blir et helt døgn.'; } },
    { id: 'E7', gruppe: 'historie', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi sjudagersuka kom fra Babylon, ikke fra astronomien.'; } },
    { id: 'E8', gruppe: 'historie', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi keiser Konstantin gjorde sjudagersuka offisiell i Romerriket i år 321.'; } },
    { id: 'E9', gruppe: 'historie', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi den franske revolusjonskalenderen innførte tidagersuker i 1793. Da hadde du hatt enda lenger igjen.'; } },
    { id: 'E10', gruppe: 'historie', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi Sovjetunionen avskaffet uka i 1929 og innførte en femdagerssyklus uten ukedagsnavn. Det varte i to år.'; } },
    { id: 'E11', gruppe: 'historie', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi uka er den eneste tidsenheten vi bruker som ikke finnes i astronomien. Døgnet er en rotasjon, måneden en måne, året en bane. Uka er bare en avtale.'; } },
    { id: 'E12', gruppe: 'historie', fredag: false, gyldig: null,
      tekst: function (n) { return 'Fordi fredag er oppkalt etter gudinnen Frigg, ' + TILHORER[n.ukedag] + '.'; } },
    { id: 'E13', gruppe: 'historie', fredag: false, gyldig: null,
      tekst: function (n) { return 'Fordi ukedagsnavnene er oversatt fra latin. Dies Veneris ble til frjádagr, som ble til fredag. I dag er det ' + LATIN[n.ukedag] + '.'; } },

    /* F. Skuddår og systematikk */
    { id: 'F1', gruppe: 'skuddaar', fredag: false, gyldig: null,
      tekst: function (n) {
        var start = 'Fordi ' + n.skuddaar + ' skuddår siden 1900 har forskjøvet ukedagene med ' + n.skuddforskyvning + ' dager. ';
        return start + (n.ukedagUtenSkuddaar === 'fredag'
          ? 'Uten dem hadde det faktisk vært fredag i dag.'
          : 'Uten dem hadde i dag vært en ' + n.ukedagUtenSkuddaar + '.');
      } },
    { id: 'F2', gruppe: 'skuddaar', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi et vanlig år er 52 uker og én dag. Derfor flytter samme dato seg én ukedag fram hvert år, og to over et skuddår.'; } },
    { id: 'F3', gruppe: 'skuddaar', fredag: false, gyldig: null,
      tekst: function (n) { return 'Fordi den gregorianske kalenderen gjentar seg nøyaktig hvert 400. år: 146 097 døgn, som er delelig med sju. Derfor var ' + datoTekst(n.datoFor400) + ' også en ' + n.ukedag + '.'; } },
    { id: 'F4', gruppe: 'skuddaar', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi år 1900 ikke var skuddår, men år 2000 var det.'; } },
    { id: 'F5', gruppe: 'skuddaar', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi det er lagt til 27 skuddsekunder siden 1972. Fredag har til sammen blitt utsatt med 27 sekunder.'; } },
    { id: 'F6', gruppe: 'skuddaar', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi jordas rotasjon bremses av tidevannet, og døgnet blir 1,8 millisekunder lengre per århundre. Fredag kommer stadig litt senere.'; } },

    /* G. Tall og systemer */
    { id: 'G1', gruppe: 'systemer', fredag: false, gyldig: null,
      tekst: function (n) { return 'Fordi ISO 8601 nummererer ukedagene fra én, og i dag er det dag ' + TALLORD[n.isoUkedag] + ' av sju. Fredag er dag fem.'; } },
    { id: 'G2', gruppe: 'systemer', fredag: false, gyldig: null,
      tekst: function (n) { return 'Fordi det julianske dagnummeret i dag er ' + heltall(n.jdn) + '. Deler du det på sju, blir resten ' + n.jdnMod7 + '. Fredager gir rest 4.'; } },
    { id: 'G3', gruppe: 'systemer', fredag: false, gyldig: null,
      tekst: function (n) { return 'Fordi Unix-tid er ' + heltall(n.unixSek) + ' sekunder. Regnet om til hele døgn og delt på sju blir resten ' + n.unixDagerMod7 + '. Fredag krever 1.'; } },
    { id: 'G4', gruppe: 'systemer', fredag: false, gyldig: null,
      tekst: function (n) { return 'Fordi vi er i uke ' + n.isoUke + ', og uke ' + n.isoUke + ' har nøyaktig én fredag. Den er ikke i dag.'; } },
    { id: 'G5', gruppe: 'systemer', fredag: false, gyldig: null,
      tekst: function (n) { return 'Fordi dette er dag ' + n.dagIAaret + ' av ' + n.dagerIAaret + ' i ' + n.aar + ', og bare ' + n.fredagerIAaret + ' av dem er fredager.'; } },
    { id: 'G6', gruppe: 'systemer', fredag: false,
      gyldig: function (n) { return n.fredagerIgjen > 0; },
      tekst: function (n) { return 'Fordi det er ' + n.fredagerIgjen + ' fredager igjen i ' + n.aar + ', og ingen av dem er i dag.'; } },
    { id: 'G7', gruppe: 'systemer', fredag: false, gyldig: null,
      tekst: function (n) { return 'Fordi den 13. i måneden oftere er fredag enn noen annen ukedag: 688 av 4 800 måneder i en 400-årssyklus. Neste gang er ' + datoTekst(n.nesteFredag13) + '.'; } },
    { id: 'G8', gruppe: 'systemer', fredag: false, gyldig: null,
      tekst: function (n) { return 'Fordi Zellers kongruens gir ' + n.zeller + ' for dagens dato. Fredag krever 6.'; } },

    /* H. Fysikk */
    { id: 'H1', gruppe: 'fysikk', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi tiden bare går én vei. Entropien øker, og det er den eneste grunnen til at i går og i morgen betyr noe forskjellig.'; } },
    { id: 'H2', gruppe: 'fysikk', fredag: false,
      gyldig: function (n) { return n.msTilFredag > 2 * 3600000; },
      tekst: function (n) {
        var t = n.msTilFredag / 3600000;
        return 'Fordi du ikke reiser fort nok. Ved 99 prosent av lysfarten ville de ' + pentTall(t) + ' timene til fredag føles som ' + pentTall(t / 7.089) + ' timer.';
      } },
    { id: 'H3', gruppe: 'fysikk', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi tyngdekraften her er for svak. Tett på et svart hull ville du sett fredag komme mye raskere.'; } },
    { id: 'H4', gruppe: 'fysikk', fredag: false,
      gyldig: function (n) { return n.msTilFredag > 3600000; },
      tekst: function (n) { return 'Fordi klokkene i GPS-satellittene vinner 38 mikrosekunder på din hvert døgn. De rekker fredag ' + enhet(Math.round(38 * n.msTilFredag / 86400000), 'mikrosekund', 'mikrosekunder') + ' før deg.'; } },
    { id: 'H5', gruppe: 'fysikk', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi Scott Kelly tapte fem millisekunder på 340 døgn i bane rundt jorda. Selv det hadde ikke hjulpet deg.'; } },
    { id: 'H6', gruppe: 'fysikk', fredag: false, gyldig: null,
      tekst: function (n) { return 'Fordi ett sekund er 9 192 631 770 svingninger i et cesium-133-atom, og det gjenstår ' + stortTall(CESIUM * n.msTilFredag / 1000) + ' av dem til fredag.'; } },
    { id: 'H7', gruppe: 'fysikk', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi tid ikke er noe som går. Det er bare noe vi måler.'; } },

    /* I. Språk og logikk */
    { id: 'I1', gruppe: 'spraak', fredag: false, gyldig: null,
      tekst: function (n) { return 'Fordi det er ' + n.ukedag + '.'; } },
    { id: 'I2', gruppe: 'spraak', fredag: false, gyldig: null,
      tekst: function (n) { return 'Fordi fredag staves f-r-e-d-a-g, og i dag staves ' + n.ukedag.split('').join('-') + '.'; } },
    { id: 'I3', gruppe: 'spraak', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi ukedagene følger et fast system.'; } },
    { id: 'I4', gruppe: 'spraak', fredag: false,
      gyldig: function (n) { return n.ukedagNr >= 1 && n.ukedagNr <= 4; },
      tekst: function (n) { return 'Fordi ' + n.ukedag + ' kommer før fredag i uka, og rekkefølgen er ikke til forhandling.'; } },
    { id: 'I5', gruppe: 'spraak', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi spørsmålet forutsetter at det burde vært fredag. Det burde det ikke.'; } },
    { id: 'I6', gruppe: 'spraak', fredag: false, gyldig: null,
      tekst: function () { return 'Fordi seks av sju dager ikke er fredag. Dette er den vanlige tilstanden.'; } },
    { id: 'I7', gruppe: 'spraak', fredag: false,
      gyldig: function (n) { return n.ukedag.length === 7; },
      tekst: function (n) { return 'Fordi fredag har seks bokstaver og ' + n.ukedag + ' har sju.'; } },

    /* J. Når det faktisk er fredag */
    { id: 'J1', gruppe: 'fredag', fredag: true, gyldig: null,
      tekst: function (n) { return 'Fordi du befinner deg ' + n.egetSted + ', og der er det fredag.'; } },
    { id: 'J2', gruppe: 'fredag', fredag: true, gyldig: null,
      tekst: function () { return 'Det er ikke pent å lyve.'; } },
    { id: 'J3', gruppe: 'fredag', fredag: true, gyldig: null,
      tekst: function () { return 'Fordi det er fredag i dag.'; } },
    { id: 'J4', gruppe: 'fredag', fredag: true, gyldig: null,
      tekst: function () { return 'Fordi premisset i spørsmålet er feil.'; } },
    { id: 'J5', gruppe: 'fredag', fredag: true,
      gyldig: function (n) { return n.msIFredag > 60000; },
      tekst: function (n) { return 'Fordi fredagen begynte der du er for ' + timerOgMinutter(n.msIFredag) + ' siden.'; } },
    { id: 'J6', gruppe: 'fredag', fredag: true, gyldig: null,
      tekst: function () { return 'Fordi det er dag fem av sju i ISO 8601, og dag fem er fredag.'; } },
    { id: 'J7', gruppe: 'fredag', fredag: true, gyldig: null,
      tekst: function (n) { return 'Fordi det julianske dagnummeret i dag er ' + heltall(n.jdn) + '. Deler du det på sju, blir resten 4. Det betyr fredag.'; } },
    { id: 'J8', gruppe: 'fredag', fredag: true, gyldig: null,
      tekst: function (n) { return 'Fordi det er ' + timerOgMinutter(n.msIgjenAvFredag) + ' igjen av fredagen. Bruk dem godt.'; } },
    { id: 'J9', gruppe: 'fredag', fredag: true, gyldig: null,
      tekst: function () { return 'Fordi jorda har rotert nøyaktig som den skulle, og resultatet er fredag.'; } },
    { id: 'J10', gruppe: 'fredag', fredag: true, gyldig: null,
      tekst: function () { return 'Fordi du hadde 14,29 prosent sjanse, og i dag var det din dag.'; } },
    { id: 'J11', gruppe: 'fredag', fredag: true,
      gyldig: function (n) { return n.msTilFredagNiue > 0; },
      tekst: function (n) { return 'Fordi det er fredag her, men ikke på Niue. Der må de vente ' + timerOgMinutter(n.msTilFredagNiue) + ' til.'; } },
    { id: 'J12', gruppe: 'fredag', fredag: true, gyldig: null,
      tekst: function () { return 'Fordi du spør på feil dag. Prøv igjen i morgen.'; } }
  ];

  /* ---------- Utvelgelse ---------- */

  function gyldige(n) {
    return BANK.filter(function (s) {
      if (s.fredag !== n.erFredag) return false;
      if (typeof s.gyldig === 'function' && !s.gyldig(n)) return false;
      return true;
    });
  }

  function velg(naa) {
    var n = byggKontekst(naa);
    var kandidater = gyldige(n);
    var forrige = null;
    try { forrige = sessionStorage.getItem('forrigeSvar'); } catch (e) { /* privat modus */ }
    var uten = kandidater.filter(function (s) { return s.id !== forrige; });
    if (uten.length) kandidater = uten;
    var valgt = kandidater[Math.floor(Math.random() * kandidater.length)];
    try { sessionStorage.setItem('forrigeSvar', valgt.id); } catch (e) { /* privat modus */ }
    return { id: valgt.id, gruppe: valgt.gruppe, tekst: valgt.tekst(n), antallGyldige: kandidater.length };
  }

  return {
    velg: velg, byggKontekst: byggKontekst, gyldige: gyldige,
    BANK: BANK, STEDER: STEDER
  };
})();

if (typeof module !== 'undefined') { module.exports = Svar; }
