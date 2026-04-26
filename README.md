# Kampgenerator - Lauvåsen IF

Dette prosjektet er en statisk webapp for planlegging og gjennomføring av kanonballturnering.
Applikasjonen kjøres uten backend og bruker localStorage, lokale JSON-filer og eventuelt GitHub som delt lagring.

## Analyse av løsningen

Prosjektet består av tre hovedsider:

- index.html: admin-side for oppsett, generering, import/eksport og publisering av kampoppsett.
- kampoppsett.html: visningsside for ferdig kampoppsett.
- resultater.html: registrering av kampresultater og automatisk poengtabell.

Felles logikk ligger i script.js, og felles stil i style.css.

## Kjernefunksjoner

- Automatisk round-robin-oppsett via generateRoundRobin().
- Slot-basert kampfordeling med hensyn til hvile mellom kamper.
- Rettferdig banefordeling mellom lag med assignCourtsFairly().
- Automatisk beregning av første/siste kamp og lengste pause per lag.
- Resultatregistrering per kamp og poengtabell med 2-1-0 poengsystem.
- Import/eksport av kampoppsett og resultater i JSON-format.
- Publisering og henting av data fra GitHub (GitHub Contents API + fallback til raw URL).
- Kildevisning i UI: GitHub, lokal fil eller lokal cache.
- Enkel admin-innlogging (lagret i localStorage) og dark mode.

## Datakilder og prioritert lasting

Kampoppsett og resultater lastes med fallback i denne rekkefølgen:

1. GitHub (publisert kilde).
2. Lokal fil (kampoppsett.json / resultater.json hvis tilgjengelig).
3. Lokal cache i nettleseren (localStorage).

Dette gjør at sidene kan fungere både lokalt og publisert, selv om en kilde ikke er tilgjengelig.

## Filer i prosjektet

- index.html: oppsett og administrasjon.
- kampoppsett.html: visning av lagret oppsett.
- resultater.html: resultatføring og tabell.
- script.js: all hovedlogikk (generering, import, lagring, GitHub-integrasjon).
- style.css: felles utseende inkl. dark mode.
- kampoppsett.json: eksempel/lagret kampoppsett.

## Bruk

1. Åpne index.html i nettleser.
2. Logg inn som administrator for å aktivere admin-funksjoner.
3. Sett antall lag, baner, kamplengde, pauser og starttid.
4. Generer kampoppsett.
5. Lagre til fil eller publiser til GitHub.
6. Åpne kampoppsett.html for visning.
7. Åpne resultater.html for resultatregistrering og poengtabell.

## GitHub-integrasjon

Standard oppsett i koden peker til:

- owner: KristianMydland
- repo: kanonball
- branch: main
- path kampoppsett: kampoppsett.json
- path resultater: resultater.json

Ved publisering brukes token med skrive-tilgang til repository-innhold.

## Teknisk oppsummering

- Frontend-only (HTML, CSS, JavaScript).
- Ingen database eller server kreves.
- Persistens via localStorage, JSON-filer og/eller GitHub.
- Løsningen er godt egnet for enkel drift under turnering.

