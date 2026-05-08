# FilterNews

FilterNews on pieni Chrome-laajennus, joka pehmentää raskaita uutisaiheita niin, etteivät ne ole sivulla ensimmäisenä kaikkein voimakkaimmin esillä.

## Mitä se tekee

- Tunnistaa todennäköisiä uutiskortteja ja artikkelinostoja sivuilta.
- Etsii valittujen aiheiden avainsanoja: sota, väkivalta, onnettomuudet, rikokset ja politiikka.
- Tukee omia suodatussanoja, jotka näkyvät popupissa poistettavina tageina.
- Omat vähintään 4 merkin sanat osuvat myös yhdyssanan alussa tai lopussa, esimerkiksi `virus` osuu sanoihin `viruskaaos` ja `koronavirus`.
- Joillekin omille sanoille on kevyt sanaperhelogiikka: esimerkiksi `kuolema` osuu myös muotoihin kuten `kuollut`, `kuolleena` ja `kuoli`.
- Sivustolista rajaa käytön haluttuihin domaineihin. Tyhjänä FilterNews toimii kaikilla sivuilla.
- Antaa valita, sumennetaanko vai piilotetaanko osumat.
- Lisää jokaiseen suodatettuun kohtaan "Näytä silti" -napin.
- Tallentaa asetukset Chrome sync storageen.

## Kokeile paikallisesti

1. Avaa `chrome://extensions`.
2. Laita **Developer mode** päälle.
3. Klikkaa **Load unpacked**.
4. Valitse kansio `C:\Users\petsk\Documents\New project 2`.
5. Avaa uutissivu ja säädä FilterNewsia Chromen extension-valikosta.

## Huomio

Ensimmäinen versio käyttää vain paikallista avainsanahakua. Se ei lähetä sivun sisältöä mihinkään eikä käytä ulkoista AI-palvelua.
