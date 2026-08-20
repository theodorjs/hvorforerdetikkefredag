# Hvorfor er det ikke fredag?

En nettside som svarer, vitenskapelig korrekt, på spørsmålet **«Hvorfor er det ikke fredag?»**

Spørsmålet står øverst. Under står ett tilfeldig svar i stor halvfet skrift mot svart bakgrunn. Nytt svar hver gang siden lastes.

> Fordi det julianske dagnummeret i dag er 2 461 272. Deler du det på sju, blir resten 2. Fredager gir rest 4.

> Fordi da ti dager forsvant fra kalenderen i oktober 1582, gikk ukedagene uforstyrret videre: torsdag 4. oktober ble etterfulgt av fredag 15. oktober.

> Fordi Samoa strøk fredag 30. desember 2011 fra kalenderen da de byttet side av datolinja. De gikk fra torsdag rett til lørdag.

Inspirert av [erdetfredag.dk](https://erdetfredag.dk/), som kun svarer ja eller nei.

## Hvordan den virker

82 svar fordelt på ti kategorier: tidssoner, nedtelling, jordas bevegelse, sol og måne, kalenderhistorie, skuddår, tallsystemer, fysikk, språk og egne svar for når det faktisk *er* fredag.

Rundt to tredeler av svarene regnes ut i det øyeblikket siden åpnes — solhøyden i Oslo, månefasen, det julianske dagnummeret, hvor mange grader jorda må rotere, hvilke steder på kloden som allerede har fredag.

Svar som ikke er sanne akkurat nå, blir filtrert bort før trekningen. Det er hele poenget med siden: den skal aldri lyve. Fra Norge en onsdag finnes det for eksempel ikke ett eneste sted på jorda hvor det er fredag, og da holdes alle svar som påstår noe annet utenfor.

## Kjør lokalt

Åpne `index.html` direkte i nettleseren. Ingen installasjon, ingen pakker, ingen byggesteg.

Eller start en lokal tjener:

```
python3 -m http.server
```

## Kjør testene

```
node test.js
```

46 tester som sjekker kalenderberegninger mot faste datoer, solposisjon mot teoretiske verdier for Oslo, og hvert eneste svar gjennom alle 168 timene i en uke. Testene fanger manglende entallsbøyning, tall som blir `undefined`, svar over 170 tegn, danske former, og svar som påstår noe usant om hvor i verden det er fredag.

## Filer

| Fil | Innhold |
| --- | --- |
| `index.html` | Hele siden, med CSS inline |
| `svar.js` | Svarbanken og utvelgelsen |
| `astro.js` | Solposisjon, månefase, kalenderberegninger |
| `test.js` | Testene |
| `og-bilde.png` | Delingsbilde for Slack, Messenger og liknende |
| `MVP.md` | Spesifikasjonen, med alle svarene og reglene de følger |

Til sammen under 80 kB. Alt kjøres i nettleseren. Ingen server, ingen sporing, ingen informasjonskapsler.

## Publisering

Ligger klar for GitHub Pages. Se `MVP.md` for detaljer om domene og oppsett.

Når nettadressen er på plass, må `og:image` i `index.html` byttes til en full adresse — Facebook og Slack godtar ikke relative stier i delingsbilder.
