/* test.js — kjør med: node test.js
   Faste datoer, slik at tallene kan verifiseres uten å vente på riktig ukedag. */

global.Astro = require('./astro.js');
var Svar = require('./svar.js');

var feil = 0, ok = 0;
function sjekk(navn, betingelse, detalj) {
  if (betingelse) { ok++; }
  else { feil++; console.log('  FEIL: ' + navn + (detalj ? '  —  ' + detalj : '')); }
}
function naer(navn, faktisk, forventet, slingring) {
  sjekk(navn, Math.abs(faktisk - forventet) <= slingring,
        'fikk ' + faktisk.toFixed(3) + ', forventet ' + forventet + ' ± ' + slingring);
}
function bolk(navn) { console.log('\n' + navn); }

/* ---------- Kalender ---------- */
bolk('Kalender');

sjekk('JDN for 19. august 2026', Astro.julianskDagnummer(2026, 8, 19) === 2461272);
// JDN mod 7: 0 = mandag, 4 = fredag
var forventetMod = { 17: 0, 18: 1, 19: 2, 20: 3, 21: 4, 22: 5, 23: 6 };
Object.keys(forventetMod).forEach(function (dag) {
  sjekk('JDN mod 7 for ' + dag + '. august 2026',
        Astro.julianskDagnummer(2026, 8, +dag) % 7 === forventetMod[dag]);
});
sjekk('Zeller gir 6 for fredag 21. august 2026', Astro.zeller(2026, 8, 21) === 6);
sjekk('Zeller gir 4 for onsdag 19. august 2026', Astro.zeller(2026, 8, 19) === 4);

sjekk('1900 er ikke skuddår', !Astro.erSkuddaar(1900));
sjekk('2000 er skuddår', Astro.erSkuddaar(2000));
sjekk('2024 er skuddår', Astro.erSkuddaar(2024));
sjekk('2026 har 365 dager', Astro.dagerIAaret(2026) === 365);

sjekk('19. august 2026 er dag 231 i året', Astro.dagIAaret(new Date(2026, 7, 19)) === 231);
sjekk('19. august 2026 er i uke 34', Astro.isoUke(new Date(2026, 7, 19)) === 34);
sjekk('ISO-ukedag for søndag er 7', Astro.isoUkedag(new Date(2026, 7, 23)) === 7);

// 400-årssyklusen: 146 097 døgn er delelig med sju, så ukedagen gjentar seg
sjekk('Ukedagen gjentar seg etter 400 år',
      new Date(2026, 7, 19).getDay() === new Date(1626, 7, 19).getDay());

/* ---------- Sola ---------- */
bolk('Sola i Oslo (59,9139 °N, 10,7522 °Ø)');

var maks = 0;
for (var m = 0; m < 1440; m += 1) {
  var h = Astro.solposisjon(new Date(Date.UTC(2026, 5, 21, 0, m)), 59.9139, 10.7522).hoyde;
  if (h > maks) maks = h;
}
// Teoretisk maksimum ved sommersolverv: 90 − breddegrad + aksehelning
naer('Maks solhøyde ved sommersolverv', maks, 90 - 59.9139 + 23.44, 0.1);

var minst = 90;
for (var m2 = 0; m2 < 1440; m2 += 1) {
  var h2 = Astro.solposisjon(new Date(Date.UTC(2026, 11, 21, 0, m2)), 59.9139, 10.7522).hoyde;
  if (h2 < 90 && h2 > -90) minst = Math.min(minst, h2);
}
var vinter = 0;
for (var m3 = 0; m3 < 1440; m3 += 1) {
  var h3 = Astro.solposisjon(new Date(Date.UTC(2026, 11, 21, 0, m3)), 59.9139, 10.7522).hoyde;
  if (h3 > vinter) vinter = h3;
}
naer('Maks solhøyde ved vintersolverv', vinter, 90 - 59.9139 - 23.44, 0.1);

// Soloppgang og solnedgang mot kjente verdier for Oslo (lokal tid = UTC+2 om sommeren)
var s1 = Astro.soltider(2026, 6, 21, 59.9139, 10.7522);
naer('Soloppgang 21. juni (UTC-time)', s1.oppgang.getUTCHours() + s1.oppgang.getUTCMinutes() / 60, 1.89, 0.05);
naer('Solnedgang 21. juni (UTC-time)', s1.nedgang.getUTCHours() + s1.nedgang.getUTCMinutes() / 60, 20.72, 0.05);
var s2 = Astro.soltider(2026, 12, 21, 59.9139, 10.7522);
naer('Soloppgang 21. desember (UTC-time)', s2.oppgang.getUTCHours() + s2.oppgang.getUTCMinutes() / 60, 8.30, 0.05);

// Ved solmiddag skal sola stå rett i sør
var middag = null, hoyest = -90;
for (var m4 = 0; m4 < 1440; m4 += 1) {
  var p = Astro.solposisjon(new Date(Date.UTC(2026, 5, 21, 0, m4)), 59.9139, 10.7522);
  if (p.hoyde > hoyest) { hoyest = p.hoyde; middag = p; }
}
naer('Asimut ved solmiddag er sør', middag.asimut, 180, 1);

/* ---------- Månen ---------- */
bolk('Månen');

var ny = Astro.maanefase(new Date(Date.UTC(2000, 0, 6, 18, 14)));
naer('Nymåne ved epoken gir 0 prosent lys', ny.opplyst, 0, 0.001);
var full = Astro.maanefase(new Date(Date.UTC(2000, 0, 6, 18, 14) + 29.530588853 / 2 * 86400000));
naer('Halv syklus senere er månen full', full.opplyst, 1, 0.001);
var runde = Astro.maanefase(new Date(Date.UTC(2000, 0, 6, 18, 14) + 29.530588853 * 86400000));
naer('En hel syklus senere er det nymåne igjen', runde.opplyst, 0, 0.001);

/* ---------- Svarbanken ---------- */
bolk('Svarbanken');

var ider = Svar.BANK.map(function (s) { return s.id; });
sjekk('Alle svar har unik id', new Set(ider).size === ider.length);
sjekk('Banken har 82 svar', Svar.BANK.length === 82, 'fant ' + Svar.BANK.length);

// Gå gjennom hele uka, time for time, og sjekk hvert eneste svar
var mangler = [], forLange = [], tommeDager = [];
for (var dag = 17; dag <= 23; dag++) {
  for (var time = 0; time < 24; time++) {
    var naa = new Date(2026, 7, dag, time, 30, 0);
    var n = Svar.byggKontekst(naa);
    var gyldige = Svar.gyldige(n);
    if (gyldige.length < 10) tommeDager.push(naa.toString() + ' → ' + gyldige.length);
    gyldige.forEach(function (s) {
      var t;
      try { t = s.tekst(n); } catch (e) { mangler.push(s.id + ' kastet feil: ' + e.message); return; }
      if (!t || typeof t !== 'string') { mangler.push(s.id + ' ga ingen tekst'); return; }
      if (/undefined|NaN|\[object/.test(t)) mangler.push(s.id + ' @ ' + naa.toLocaleString('nb-NO') + ': ' + t);
      if (/(?<![\d,.])\b1 (timer|ganger|minutter|sekunder|dager|mikrosekunder|døgn)\b/.test(t))
        mangler.push('entallsfeil i ' + s.id + ': ' + t);
      if (/(?<![\d,.])\b0 (timer|minutter)\b/.test(t)) mangler.push('nullfeil i ' + s.id + ': ' + t);
      if (t.length > 170) forLange.push(s.id + ' (' + t.length + ' tegn)');
      if (!/[.!?]$/.test(t)) mangler.push(s.id + ' mangler punktum: ' + t);
    });
  }
}
sjekk('Ingen svar gir undefined, NaN eller feil bøyning', mangler.length === 0,
      mangler.slice(0, 6).join(' | '));
sjekk('Ingen svar er lengre enn 170 tegn', forLange.length === 0,
      Array.from(new Set(forLange)).join(', '));
sjekk('Minst 10 gyldige svar til enhver tid', tommeDager.length === 0, tommeDager.slice(0, 3).join(' | '));

/* ---------- Språk ---------- */
bolk('Språk');

// Danske former og andre ord som ikke hører hjemme i norsk bokmål.
// «mod» står på lista fordi det leses som dansk «mot», selv om det er modulo.
var forbudt = [
  [/\baf\b/i,        'dansk «af»'],
  [/\befter[a-zæøå]*/i, 'dansk «efter» (norsk: etter)'],
  [/\bsyv\b/i,       'dansk/konservativt (norsk: sju)'],
  [/\bmod\b/i,       'leses som dansk «mot» — skriv «rest» i stedet'],
  [/\bhvad\b/i,      'dansk'],
  [/\bhvornår\b/i,   'dansk'],
  [/\bmåske\b/i,     'dansk'],
  [/\bdog\b/i,       'dansk'],
  [/\bblot\b/i,      'dansk'],
  [/\bmeget\b/i,     'dansk'],
  [/\bsådan\b/i,     'dansk'],
  [/\bnetop\b/i,     'dansk'],
  [/\bderefter\b/i,  'dansk'],
  [/\bhverken\b/i,   'dansk (norsk: verken)'],
  [/\bjorden\b/i,    'dansk-preget (norsk: jorda)'],
  [/\buge[nr]?\b/i,  'dansk (norsk: uke, uka)'],
  [/\bville [a-zæøå]+tes\b/i, 'grammatikk: «ville» skal ha infinitiv, ikke fortid'],
  [/\bjordomløp\b/i, 'et omløp er en bane rundt sola, ikke en rotasjon om aksen']
];

var spraakfeil = [];
var settTekster = new Set();
for (var sd = 17; sd <= 23; sd++) {
  for (var st = 0; st < 24; st++) {
    var sn = Svar.byggKontekst(new Date(2026, 7, sd, st, 30));
    Svar.gyldige(sn).forEach(function (s) { settTekster.add(s.id + '\t' + s.tekst(sn)); });
  }
}
settTekster.forEach(function (rad) {
  var id = rad.split('\t')[0], tekst = rad.split('\t')[1];
  forbudt.forEach(function (par) {
    if (par[0].test(tekst)) spraakfeil.push(id + ': ' + par[1] + ' — ' + tekst);
  });
});
sjekk('Ingen danske former eller feil bøyning i svarene', spraakfeil.length === 0,
      Array.from(new Set(spraakfeil)).slice(0, 5).join('\n     '));

// Alle svar skal begynne med stor forbokstav
var storBokstav = [];
settTekster.forEach(function (rad) {
  var id = rad.split('\t')[0], tekst = rad.split('\t')[1];
  if (tekst[0] !== tekst[0].toUpperCase()) storBokstav.push(id);
});
sjekk('Alle svar begynner med stor forbokstav', storBokstav.length === 0, storBokstav.join(', '));

// Nesten alle svar skal begynne med «Fordi». Unntakene er bevisste.
var unntak = ['J2'];
var uten = [];
settTekster.forEach(function (rad) {
  var id = rad.split('\t')[0], tekst = rad.split('\t')[1];
  if (tekst.indexOf('Fordi') !== 0 && unntak.indexOf(id) < 0) uten.push(id);
});
sjekk('Alle svar utenom de bevisste unntakene begynner med «Fordi»', uten.length === 0,
      Array.from(new Set(uten)).join(', '));

// Fredagssvar skal bare vises på fredager, og omvendt
var onsdag = Svar.byggKontekst(new Date(2026, 7, 19, 12, 0));
var fredag = Svar.byggKontekst(new Date(2026, 7, 21, 12, 0));
sjekk('Onsdag gir bare hverdagssvar',
      Svar.gyldige(onsdag).every(function (s) { return s.fredag === false; }));
sjekk('Fredag gir bare fredagssvar',
      Svar.gyldige(fredag).every(function (s) { return s.fredag === true; }));

// Geografisvarene må filtreres når fredag ikke finnes noe sted på jorda
var geo = ['A1', 'A2', 'A4'];
sjekk('Onsdag kl. 12: ingen påstand om at det er fredag et sted',
      !Svar.gyldige(onsdag).some(function (s) { return geo.indexOf(s.id) >= 0; }));
var torsdagKveld = Svar.byggKontekst(new Date(2026, 7, 20, 23, 0));
sjekk('Torsdag kl. 23: fredag finnes i øst',
      Svar.gyldige(torsdagKveld).some(function (s) { return s.id === 'A1'; }));
sjekk('Torsdag kl. 23: A6 er filtrert bort',
      !Svar.gyldige(torsdagKveld).some(function (s) { return s.id === 'A6'; }));

// Skuddårsregnestykket
sjekk('31 skuddår mellom 1900 og august 2026', onsdag.skuddaar === 31, 'fikk ' + onsdag.skuddaar);
sjekk('Uten skuddårene hadde onsdag 19. august 2026 vært en søndag',
      onsdag.ukedagUtenSkuddaar === 'søndag', 'fikk ' + onsdag.ukedagUtenSkuddaar);

// Nedtellingen
naer('Onsdag kl. 12 er det 1,5 døgn til fredag', onsdag.msTilFredag / 86400000, 1.5, 0.001);
sjekk('Onsdag krever 2 netters søvn', onsdag.netterTilFredag === 2);
sjekk('2026 har 52 fredager', onsdag.fredagerIAaret === 52, 'fikk ' + onsdag.fredagerIAaret);
sjekk('Neste fredag den 13. er 13. november 2026',
      onsdag.nesteFredag13.getFullYear() === 2026 && onsdag.nesteFredag13.getMonth() === 10
      && onsdag.nesteFredag13.getDate() === 13);

/* ---------- Oppsummering ---------- */
console.log('\n' + (feil === 0 ? 'Alt i orden. ' : 'MISLYKTES. ') + ok + ' tester bestått, ' + feil + ' feilet.');
process.exit(feil === 0 ? 0 : 1);
