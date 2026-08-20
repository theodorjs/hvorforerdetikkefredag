# Hvorfor er det ikke fredag — MVP

En nettside som svarer, vitenskapelig korrekt, på spørsmålet **«Hvorfor er det ikke fredag?»**

Inspirert av [erdetfredag.dk](https://erdetfredag.dk/), som kun svarer ja eller nei. Denne siden gjør det motsatte: den svarer aldri kort, men alltid presist.

---

## 1. Produktet i én setning

Spørsmålet står fast øverst på siden. Under står ett tilfeldig, faktisk korrekt svar i stor halvfet skrift mot svart bakgrunn. Nytt svar hver gang siden åpnes eller oppdateres.

## 2. Mål

* Få folk til å smile på under to sekunder.
* Hvert eneste svar skal tåle å bli faktasjekket. Humoren ligger i alvoret, ikke i tullet.
* Siden skal kunne deles i en Slack-kanal på en tirsdag og fungere umiddelbart, uten forklaring.

## 3. Ikke-mål for MVP

* Ingen brukerkontoer, database, backend, analyse eller informasjonskapsler.
* Ingen innlogging, nyhetsbrev eller deleknapper til sosiale medier.
* Ingen posisjonsforespørsel i nettleseren (krever samtykkedialog — utsettes).
* Ingen engelsk versjon.

---

## 4. Sidestruktur

Én enkelt side. Ingen navigasjon, ingen ruting.

```
┌─────────────────────────────────────────┐
│                                         │
│      Hvorfor er det ikke fredag?        │  ← statisk, mindre, dempet hvit
│                                         │
│   Fordi jorda må rotere 437 grader      │  ← svaret, stort, halvfeit, hvitt
│   til om sin egen akse før det          │     maks ~15 ord, sentrert
│   blir fredag.                          │
│                                         │
│                                         │
│              (nytt svar)                │  ← liten, dempet knapp nederst
└─────────────────────────────────────────┘
```

* Svaret er vertikalt og horisontalt sentrert i vinduet.
* Trykk hvor som helst på siden, eller på knappen, gir et nytt svar uten å laste siden på nytt.
* Ingen skrolling. Alt skal få plass i første skjermbilde, også på mobil.

## 5. Design

Spørsmål og svar har **samme skriftstørrelse**. Spørsmålet er sidens tittel og skal ha samme visuelle tyngde som svaret. De skilles på vekt og farge i stedet: tynn grå mot halvfeit hvit. Det er forskjell nok til at øyet lander på svaret først, uten at spørsmålet degraderes til en undertekst.

| Element | Verdi |
| --- | --- |
| Bakgrunn | `#000000` |
| Felles størrelse | `--tekst: clamp(1.5rem, min(5.5vw + 0.4rem, 8vh), 4rem)` |
| Svartekst | `#FFFFFF`, vekt 600, linjehøyde 1.15, `letter-spacing: -0.02em` |
| Spørsmål | `#6E6E6E`, vekt 300, linjehøyde 1.2, normal `letter-spacing` |
| Tall i svaret | Samme hvite farge, men `font-variant-numeric: tabular-nums` |
| Skrift | System-stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` |
| Maks bredde | `24ch` for begge — korte linjer leses fort |
| Luft mellom dem | `calc(var(--tekst) * 1.4)`, altså proporsjonal med skriften |
| Animasjon | Nytt svar toner inn over 250 ms. Ingen bevegelse for brukere med `prefers-reduced-motion` |

**Høydeleddet `8vh` i størrelsen er ikke pynt.** Når spørsmålet er like stort som svaret, tar de to blokkene sammen opp mot åtte tekstlinjer i verste fall. Med bare breddebasert skalering sprenger det skjermen i liggende modus på mobil, der bredden lyver om hvor mye plass som finnes. Alle 82 svar er målt mot 320×568, 375×812, 812×375 og 1280×800 uten overflow.

Fargevalget er fast — siden er alltid mørk, uansett systeminnstilling. Det er en del av uttrykket.

Levende tall (sekunder til fredag, solhøyde) oppdateres **ikke** kontinuerlig i MVP. De fryses i det øyeblikket svaret vises. Et tikkende tall stjeler oppmerksomheten fra poenget.

---

## 6. Teknisk løsning

Rene statiske filer. Ingen byggesteg, ingen pakkeavhengigheter, ingen rammeverk.

```
/
├── index.html      ← markup + all CSS (inline i <style>)
├── svar.js         ← svarbanken og utvelgelsen
├── astro.js        ← solposisjon, månefase, kalenderberegninger
├── favicon.svg
├── og-bilde.png    ← 1200×630, svart bakgrunn med spørsmålet
├── robots.txt
└── MVP.md
```

* Alt kjøres i nettleseren. Ingen serverkode, ingen API-kall, ingen nettverkskall etter første lasting.
* Tid og tidssone hentes fra brukerens egen enhet via `Date` og `Intl.DateTimeFormat().resolvedOptions()`.
* Fungerer uten JavaScript i den forstand at spørsmålet og et fast reservesvar («Fordi ukedagene følger et fast system.») ligger i HTML-en fra start.
* Total størrelse under 30 kB.

**Publisering:** GitHub Pages eller Cloudflare Pages, direkte fra `main`. Begge er gratis og gir HTTPS automatisk.

---

## 7. Svarmotoren

### Datamodell

Hvert svar er et objekt:

```js
{
  id: "rotasjon-gjenstaende",
  gruppe: "jorda",
  fredag: false,          // gjelder svaret når det ER fredag, eller når det ikke er det?
  gyldig: (n) => true,    // valgfri: er svaret meningsfullt akkurat nå?
  tekst: (n) => `Fordi jorda må rotere ${n.gradertilfredag} grader til om sin egen akse før det blir fredag.`
}
```

`n` er et kontekstobjekt som bygges én gang ved sidelasting og inneholder alt et svar kan trenge: dato, ukedag, tid til fredag, solposisjon, julianske dagnummer, tidssoner med fredag, og så videre.

### Utvelgelse

1. Bygg kontekstobjektet `n`.
2. Filtrer svarbanken: riktig `fredag`-verdi, og `gyldig(n)` må returnere sant.
3. Trekk ett tilfeldig svar fra det som er igjen.
4. Ikke gjenta forrige svar. Siste viste `id` lagres i `sessionStorage` og utelates fra trekningen.

### Gyldighetsregler — viktig

Flere svar er bare sanne deler av døgnet. Motoren **må** filtrere, ellers lyver siden.

* **«Fordi du ikke er i \{sted\}»** krever at det faktisk finnes et sted på jorda hvor det er fredag akkurat nå. Fra Norge en onsdag er det ingen slike steder i det hele tatt. Fredag eksisterer et sted på jorda i 49 timer sammenhengende (25 timer mellom Kiribati på UTC+14 og Niue på UTC−11, pluss døgnets egne 24). Utenfor det vinduet må svaret holdes utenfor.
* **«Fordi det var fredag for x dager siden»** gir lite mening på en lørdag klokka 01. Krev minst 0,5 døgn siden sist fredag.
* **Solhøyde** er negativ om natta. Da skal teksten si «under horisonten», ikke oppgi et minustall som om det var normalt.
* **Månefase** må rundes fornuftig — «0 % opplyst» er nymåne og bør sies med ord.

### Tallformatering

* Desimaltall med **komma**, ikke punktum. To desimaler: `3,47 dager`.
* Tusenskille med hardt mellomrom: `9 192 631 770`.
* Store tall i svaret skal aldri brytes over to linjer (`white-space: nowrap` rundt tallet).

---

## 8. Svarbanken

`{krøllparentes}` = beregnet verdi. **S** = statisk tekst, **B** = beregnet.

### A. Geografi og tidssoner

| # | Svar | Type | Vises når |
| --- | --- | --- | --- |
| A1 | Fordi du ikke er i {sted}. Der er det fredag akkurat nå. | B | Det finnes minst ett sted med fredag |
| A2 | Fordi fredagen begynte i Kiribati for {tid} siden og beveger seg vestover med én tidssone i timen. Den har ikke nådd deg. | B | Fredagen pågår i Kiribati |
| A3 | Fordi Kiritimati i Kiribati alltid får fredag først. Der begynner den om {tid}. | B | Kiritimati har ikke fredag ennå |
| A9 | Fordi fredagen er på vei ut av verden vestover. Den er allerede over i Kiribati, og om {tid} er den helt borte fra jorda. | B | Fredagen er over i øst, men lever i vest |
| A4 | Fordi du måtte reist {antall} timer østover for å finne fredag. | B | Det finnes en fredagssone øst for deg |
| A5 | Fordi datolinja ligger midt i Stillehavet, og du er på feil side av den. | S | Alltid |
| A6 | Fordi en fredag finnes et sted på jorda i 49 timer i strekk, og du er utenfor vinduet. | S | Ingen steder har fredag nå |
| A7 | Fordi Samoa strøk fredag 30. desember 2011 fra kalenderen da de byttet side av datolinja. De gikk fra torsdag rett til lørdag. | S | Alltid |
| A8 | Fordi klokka er {klokkeslett} i {by}, og heller ikke der er det fredag. | B | Alltid |

### B. Nedtelling

| # | Svar | Type | Vises når |
| --- | --- | --- | --- |
| B1 | Fordi det var fredag for {x,xx} dager siden. | B | Minst 0,5 døgn siden |
| B2 | Fordi det er fredag om {x,xx} dager. | B | Alltid |
| B3 | Fordi det er {t} timer, {m} minutter og {s} sekunder igjen til fredag. | B | Alltid |
| B4 | Fordi det er {n} sekunder til fredag, og {n} er større enn null. | B | Alltid |
| B5 | Fordi du må sove {n} ganger til. | B | n ≥ 1 |
| B6 | Fordi {p} prosent av uka har gått, og fredag begynner ved 57,1 prosent. | B | Alltid |
| B7 | Fordi bare 14,29 prosent av alle dager er fredag. I dag havnet du blant de resterende 85,71 prosentene. | S | Alltid |

### C. Jordas bevegelse

| # | Svar | Type | Vises når |
| --- | --- | --- | --- |
| C1 | Fordi jorda må rotere {n} grader til om sin egen akse før det blir fredag. | B | Alltid |
| C2 | Fordi jorda har rotert {n} grader siden forrige fredag begynte. | B | Alltid |
| C3 | Fordi jorda har flyttet seg {n} millioner kilometer i banen rundt sola siden forrige fredag, og det holder ikke. | B | Alltid |
| C4 | Fordi jorda har reist {n} kilometer gjennom rommet siden midnatt, uten å komme nærmere fredag. | B | Alltid |
| C5 | Fordi én omdreining om jordaksen tar 23 timer, 56 minutter og 4,1 sekunder, og du trenger {n} til. | B | Minst 0,25 omdreininger igjen |
| C6 | Fordi Oslo snurrer rundt jordaksen i 839 kilometer i timen, og selv det er for sakte. Ved ekvator er farten 1 674. | S | Alltid |

### D. Sola og månen

| # | Svar | Type | Vises når |
| --- | --- | --- | --- |
| D1 | Fordi sola står {h} grader over horisonten i Oslo akkurat nå, i asimut {a} grader. Nøyaktig som den skal på en {ukedag}. | B | Sola er over horisonten |
| D2 | Fordi sola er {h} grader under horisonten i Oslo akkurat nå, og må opp og ned {n} ganger til. | B | Sola er under horisonten |
| D3 | Fordi sola må gå ned og opp igjen {n} ganger før det blir fredag. | B | Alltid |
| D4 | Fordi sola sto opp {tid} og går ned {tid} i dag, og ingen av delene gjør det til fredag. | B | Sol står opp og ned dette døgnet |
| D5 | Fordi månen er {p} prosent opplyst og {d} dager inn i syklusen sin. Månen bryr seg ikke om uker. | B | Alltid |
| D6 | Fordi månemåneden er 29,53 døgn og ikke går opp i sju. | S | Alltid |
| D7 | Fordi lyset som treffer deg nå forlot sola for 8 minutter og 20 sekunder siden. Det var ikke fredag da heller. | S | Sola er over horisonten |

### E. Kalenderhistorie

| # | Svar | Type |
| --- | --- | --- |
| E1 | Fordi Julius Cæsar innførte den julianske kalenderen i år 46 fvt. Den erstattet den gamle romerske kalenderen og bygde på solåret med 365,25 dager, med skuddår hvert fjerde år. | S |
| E2 | Fordi pave Gregor XIII justerte den julianske kalenderen i år 1582. | S |
| E3 | Fordi da ti dager forsvant fra kalenderen i oktober 1582, gikk ukedagene uforstyrret videre: torsdag 4. oktober ble etterfulgt av fredag 15. oktober. | S |
| E4 | Fordi Danmark-Norge gikk over til den gregorianske kalenderen i 1700 og hoppet fra 18. februar rett til 1. mars, uten å røre ukedagene. | S |
| E5 | Fordi det julianske året var elleve minutter for langt. Siden kirkemøtet i Nikea i år 325 hadde feilen vokst til ti dager, og de ble strøket i 1582. | S |
| E6 | Fordi det gregorianske året bommer med 26 sekunder i året. Det tar 3 300 år før det blir et helt døgn. | S |
| E7 | Fordi sjudagersuka kom fra Babylon, ikke fra astronomien. | S |
| E8 | Fordi keiser Konstantin gjorde sjudagersuka offisiell i Romerriket i år 321. | S |
| E9 | Fordi den franske revolusjonskalenderen innførte tidagersuker i 1793. Da hadde du hatt enda lenger igjen. | S |
| E10 | Fordi Sovjetunionen avskaffet uka i 1929 og innførte en femdagerssyklus uten ukedagsnavn. Det varte i to år. | S |
| E11 | Fordi uka er den eneste tidsenheten vi bruker som ikke finnes i astronomien. Døgnet er en rotasjon, måneden en måne, året en bane. Uka er bare en avtale. | S |
| E12 | Fordi fredag er oppkalt etter gudinnen Frigg, mens {ukedag} tilhører {gud eller himmellegeme}. | B |
| E13 | Fordi ukedagsnavnene er oversatt fra latin. Dies Veneris ble til frjádagr, som ble til fredag. I dag er det {latinsk navn}. | B |

Oppslagstabell til E12/E13:

| Dag | Oppkalt etter | Latin |
| --- | --- | --- |
| mandag | månen | dies Lunae |
| tirsdag | krigsguden Ty | dies Martis |
| onsdag | Odin | dies Mercurii |
| torsdag | Tor | dies Iovis |
| fredag | Frigg | dies Veneris |
| lørdag | laugardagr, norrønt for vaskedag | dies Saturni |
| søndag | sola | dies Solis |

### F. Skuddår og systematikk

| # | Svar | Type |
| --- | --- | --- |
| F1 | Fordi {n} skuddår siden 1900 har forskjøvet ukedagene med {n mod 7} dager. Uten dem hadde i dag vært en {ukedag}. | B |
| F2 | Fordi et vanlig år er 52 uker og én dag. Derfor flytter samme dato seg én ukedag fram hvert år, og to over et skuddår. | S |
| F3 | Fordi den gregorianske kalenderen gjentar seg nøyaktig hvert 400. år: 146 097 døgn, som er delelig med sju. Derfor var {dato} i {år−400} også en {ukedag}. | B |
| F4 | Fordi år 1900 ikke var skuddår, men år 2000 var det. | S |
| F5 | Fordi det er lagt til 27 skuddsekunder siden 1972. Fredag har til sammen blitt utsatt med 27 sekunder. | S |

> Tallet 27 i F5 gjaldt sist ved skuddsekundet 31. desember 2016. Sjekk mot IERS Bulletin C før lansering. Ordningen skal etter planen avvikles innen 2035.

| F6 | Fordi jordas rotasjon bremses av tidevannet, og døgnet blir 1,8 millisekunder lengre per århundre. Fredag kommer stadig litt senere. | S |

> **F1 har en fin spesialtilstand:** noen ganger regner den ut at det uten skuddårene *hadde* vært fredag i dag. Da skal teksten avsluttes med «Uten dem hadde det faktisk vært fredag i dag.» Det er sidens beste svar når det inntreffer, og det skal ikke skjules.

### G. Tall og systemer

| # | Svar | Type |
| --- | --- | --- |
| G1 | Fordi ISO 8601 nummererer ukedagene fra én, og i dag er det dag {tallord} av sju. Fredag er dag fem. | B |
| G2 | Fordi det julianske dagnummeret i dag er {jdn}. Deler du det på sju, blir resten {r}. Fredager gir rest 4. | B |
| G3 | Fordi Unix-tid er {t} sekunder. Regnet om til hele døgn og delt på sju blir resten {r}. Fredag krever 1. | B |
| G4 | Fordi vi er i uke {n}, og uke {n} har nøyaktig én fredag. Den er ikke i dag. | B |
| G5 | Fordi dette er dag {n} av {365 eller 366} i {år}. | B |
| G6 | Fordi det er {n} fredager igjen i {år}, og ingen av dem er i dag. | B |
| G7 | Fordi den 13. i måneden oftere er fredag enn noen annen ukedag: 688 av 4 800 måneder i en 400-årssyklus. Neste gang er {dato}. | B |
| G8 | Fordi Zellers kongruens gir {r} for dagens dato. Fredag krever 6. | B |

### H. Fysikk

| # | Svar | Type |
| --- | --- | --- |
| H1 | Fordi tiden bare går én vei. Entropien øker, og det er den eneste grunnen til at i går og i morgen betyr noe forskjellig. | S |
| H2 | Fordi du ikke reiser fort nok. Ved 99 prosent av lysfarten ville de {n} timene til fredag føles som {n/7,09} timer. | B |
| H3 | Fordi tyngdekraften her er for svak. Tett på et svart hull ville du sett fredag komme mye raskere. | S |
| H4 | Fordi klokkene i GPS-satellittene vinner 38 mikrosekunder på din hvert døgn. De rekker fredag {n} mikrosekunder før deg. | B |
| H5 | Fordi Scott Kelly tapte fem millisekunder på 340 døgn i bane rundt jorda. Selv det hadde ikke hjulpet deg. | S |
| H6 | Fordi ett sekund er 9 192 631 770 svingninger i et cesium-133-atom, og det gjenstår {n} av dem til fredag. | B |
| H7 | Fordi tid ikke er noe som går. Det er bare noe vi måler. | S |

### I. Språk og logikk

| # | Svar | Type | Vises når |
| --- | --- | --- | --- |
| I1 | Fordi det er {ukedag}. | B | Alltid |
| I2 | Fordi fredag staves f-r-e-d-a-g, og i dag staves {u-k-e-d-a-g}. | B | Alltid |
| I3 | Fordi ukedagene følger et fast system. | S | Alltid |
| I4 | Fordi {ukedag} kommer før fredag i uka, og rekkefølgen er ikke til forhandling. | B | Alltid |
| I5 | Fordi spørsmålet forutsetter at det burde vært fredag. Det burde det ikke. | S | Alltid |
| I6 | Fordi seks av sju dager ikke er fredag. Dette er den vanlige tilstanden. | S | Alltid |
| I7 | Fordi fredag har seks bokstaver og {ukedag} har sju. | B | Kun tirsdag og torsdag — de andre dagene har også seks, og da faller poenget |

### J. Når det faktisk ER fredag

| # | Svar | Type |
| --- | --- | --- |
| J1 | Fordi du befinner deg i {sted}, og der er det fredag. | B |
| J2 | Det er ikke pent å lyve. | S |
| J3 | Fordi det er fredag i dag. | S |
| J4 | Fordi premisset i spørsmålet er feil. | S |
| J5 | Fordi fredagen begynte der du er for {t} timer og {m} minutter siden. | B |
| J6 | Fordi det er dag fem av sju i ISO 8601, og dag fem er fredag. | S |
| J7 | Fordi det julianske dagnummeret i dag er {jdn}. Deler du det på sju, blir resten 4. Det betyr fredag. | B |
| J8 | Fordi det er {t} timer og {m} minutter igjen av fredagen. Bruk dem godt. | B |
| J9 | Fordi jorda har rotert nøyaktig som den skulle, og resultatet er fredag. | S |
| J10 | Fordi du hadde 14,29 prosent sjanse, og i dag var det din dag. | S |
| J11 | Fordi det er fredag her, men ikke på Niue. Der må de vente {t} timer til. | B |
| J12 | Fordi du spør på feil dag. Prøv igjen i morgen. | S |

**Totalt: 82 svar — 70 for vanlige dager (A–I) og 12 for fredager (J).**

Med filtrering på gyldighet er det typisk 55–65 svar i trekningen på en gitt dag. Det er nok til at en person som besøker siden hver dag i et halvt år sjelden får samme svar to ganger på rad.

---

### Språkregler

Siden er norsk, og forbildet er dansk. Da må språket være hundre prosent norsk bokmål, ellers klinger det galt.

* **Ingen danske former.** `jorda` ikke `jorden`, `uka` ikke `ugen`, `sju` ikke `syv`, `etter` ikke `efter`.
* **Ingen matematisk notasjon som kan misleses.** Modulo skrives «deler du det på sju, blir resten 2», ikke «mod 7» — `mod` betyr «mot» på dansk og leses feil av norske øyne.
* **Ikke bland siffer og bokstaver i samme opptelling.** «dag tre av sju», ikke «dag 3 av sju».
* **Riktige fagord.** Et *omløp* er en bane rundt sola. En rotasjon om jordaksen er en *omdreining*.
* Alle svar begynner med stor forbokstav, og alle utenom «Det er ikke pent å lyve» begynner med «Fordi».

Reglene håndheves av `test.js`, som avviser en liste over danske former og feilbøyninger i alle svar gjennom hele uka.

## 9. Beregninger som må implementeres i `astro.js`

| Funksjon | Metode |
| --- | --- |
| Tid til/fra fredag | Ren `Date`-aritmetikk mot nærmeste fredag kl. 00:00 lokal tid |
| Julianske dagnummer | `JDN = d + (153m+2)/5 + 365y + y/4 − y/100 + y/400 − 32045` (heltallsdivisjon) |
| Zellers kongruens | `h = (d + ⌊13(m+1)/5⌋ + K + ⌊K/4⌋ + ⌊J/4⌋ + 5J) mod 7`, fredag = 6 |
| Solhøyde og asimut | NOAA-algoritmen: soldeklinasjon, tidsligning, timevinkel. Nøyaktig innen 0,1 grad. Oslo: 59,913 °N, 10,739 °Ø |
| Soloppgang og solnedgang | Samme grunnlag, timevinkel ved høyde −0,833 grader |
| Månefase | Synodisk måned 29,530588 døgn fra kjent nymåne (2000-01-06 18:14 UTC) |
| Steder med fredag | Fast liste over IANA-soner med representative bynavn, sjekket mot `Intl.DateTimeFormat` |
| Jordas banefart | 29,78 km/s, altså 2,573 millioner km per døgn |

Alle beregninger må ha en enhetstest med en fast, innhardkodet dato slik at tallene kan verifiseres uten å vente på riktig ukedag.

---

## 10. Tilgjengelighet og deling

* Svarfeltet er `<main>` med `aria-live="polite"` slik at nytt svar leses opp av skjermleser.
* Kontrast hvit på svart er 21:1, langt over kravet.
* `<title>`: «Hvorfor er det ikke fredag?»
* `<meta name="description">`: «Et vitenskapelig korrekt svar på spørsmålet. Nytt svar hver gang.»
* Open Graph-bilde med spørsmålet i hvit tekst på svart, slik at delinger i Slack og Messenger ser riktige ut. Bildet viser spørsmålet, ikke et svar — svaret skal oppleves ferskt.
* `lang="nb"` på `<html>`.

---

## 11. Domene

Ønsket `hvorforerdetikkefredag.no` er 25 tegn og tungt å taste, men det er også hele poenget, og folk kommer stort sett til å klikke på en lenke framfor å skrive den. Forkortelsen `hedif` sier ingenting til noen.

Kandidater, i den rekkefølgen jeg ville sjekket dem:

1. `hvorforerdetikkefredag.no` — nøyaktig spørsmålet, lett å huske selv om den er lang
2. `hvorforikkefredag.no` — kortere, samme gjenkjennelse
3. `ikkefredag.no` — kortest, fungerer godt som avsender
4. `erdetfredag.no` — nærmest det danske forbildet, men kan allerede være tatt

Praktisk om `.no`: privatpersoner kan registrere `.no`-domener, med en øvre grense på fem per person, og du må være myndig og registrert i Folkeregisteret. Registreringen skjer gjennom en forhandler, ikke hos Norid direkte. Domeneshop, One.com og Domainname.no er vanlige valg, og prisen ligger typisk på et par hundre kroner i året.

Om du vil ha noe raskt og billig å teste med først: `.com` eller `.net` har ingen krav i det hele tatt, og GitHub Pages gir deg uansett en gratis adresse på `brukernavn.github.io` som fungerer fra dag én. Domenet kan kobles på når som helst uten at noe må bygges om.

Dette er noe du må gjøre selv — jeg kan verken sjekke tilgjengelighet mot registeret eller kjøpe domenet for deg.

---

## 12. Åpne spørsmål

1. ~~**«Blar gjennom flere tilfeldige svar»**~~ — **avklart:** ett svar per lasting. Oppdatering av siden gir nytt svar. Det ligger i tillegg en dempet «nytt svar»-knapp nederst, som gjør det samme uten ny lasting. Ingen animasjon som blar gjennom flere svar.
2. **Sted for solberegning** — MVP bruker Oslo og sier «i Oslo». Alternativet er å gjette posisjon ut fra tidssonen, eller be om posisjon. Oslo er ærligst uten å spørre om noe.
3. **Levende tall** — skal sekundene til fredag telle ned mens du ser på?
4. **Lyd** — nei, ikke i MVP.

## 13. Slik kjører og tester du

Ingen installasjon, ingen pakker.

* **Kjør siden:** åpne `index.html` direkte i nettleseren, eller start en lokal tjener med `python3 -m http.server`.
* **Kjør testene:** `node test.js`. 46 tester som sjekker kalenderberegninger mot faste datoer, solposisjon mot teoretiske verdier for Oslo, og hvert eneste svar gjennom alle 168 timene i en uke.

Testene fanger blant annet manglende entallsbøyning, tall som blir `undefined`, svar over 170 tegn, danske former, og svar som påstår noe usant om hvor i verden det er fredag.

## 14. Etter MVP

* Engelsk versjon på eget domene.
* Posisjon fra nettleseren, slik at solberegningen gjelder der brukeren faktisk står.
* Permanente lenker til enkeltsvar, `?svar=jdn`, slik at et godt svar kan deles direkte.
* Sesongsvar: jul, skuddårsdagen 29. februar, sommertidsomlegging, fredag den 13.
* Et arkiv over alle svarene på `/alle`, for de som vil lese hele banken.
