# Lauvåsen IF – Kanonballturnering 2026

Dette er et statisk, webbasert system for å:

- lage kampoppsett for kanonballturnering
- vise kampoppsett til deltakere
- registrere resultater
- vise poengtabell
- lagre og hente data lokalt eller via GitHub

Systemet krever ingen backend og kan kjøres lokalt eller via GitHub Pages.

## Oversikt

Systemet består av tre sider:

- **index.html** – administrasjon, oppretting og publisering av kampoppsett
- **kampoppsett.html** – visning av lagret kampoppsett
- **resultater.html** – registrering av resultater og visning av poengtabell

## Funksjoner

- Automatisk kampoppsett (round robin)
- Fordeling av kamper med hvile mellom lagene
- Fargekoder for lag og baner
- Poengtabell med 2–1–0 poengsystem
- Import og eksport av JSON-filer
- Publisering til GitHub
- Lasting fra GitHub
- Visning av kilde, lagringstid og revisjon
- Dark mode

## Før du starter

Du kan bruke systemet på to måter:

1. Lokalt på egen PC ved å åpne HTML-filene i nettleser.
2. Publisert på GitHub Pages slik at andre kan åpne sidene via nettadresse.

Hvis du skal bruke GitHub-funksjonene, trenger du:

- et GitHub-repository
- en branch, normalt `main`
- en GitHub token med tilgang til å skrive til repository-innhold

## Administrator

Noen funksjoner krever innlogging som administrator, for eksempel:

- generere kampoppsett
- endre lag
- registrere resultater
- publisere til GitHub

Når du er logget inn, aktiveres administrative knapper og felt.

## Bruk av index.html

Denne siden brukes til å lage og administrere kampoppsett.

### Slik lager du et nytt kampoppsett

1. Åpne `index.html`.
2. Logg inn som administrator.
3. Velg antall lag.
4. Velg antall baner.
5. Sett kamp-lengde, pause og starttid.
6. Skriv inn lagnavn.
7. Trykk **Generer kampoppsett**.

Systemet lager da:

- en kampoversikt
- en tabell med første kamp, siste kamp og lengste pause per lag

### Knapper på index.html

- **Generer kampoppsett** – lager nytt oppsett
- **Lagre kampoppsett til fil (JSON)** – eksporterer kampoppsett til fil
- **Lagre kampoppsett som HTML** – lagrer HTML-visning av kampoppsett
- **Importer kampoppsett fra fil (JSON)** – leser kampoppsett fra lokal fil
- **Last kampoppsett fra GitHub** – henter kampoppsett fra GitHub-konfigurasjonen
- **Importer resultater fra fil (JSON)** – leser resultater fra lokal fil
- **Publiser kampoppsett til GitHub** – lagrer kampoppsett i repository

### Kildeinformasjon på index.html

Under overskriften for kampoppsett vises:

- **Kilde** – hvor data kom fra, for eksempel GitHub eller lokal cache
- **Lagret** – tidspunkt for siste lagring
- **Revisjon** – kort GitHub SHA når data kommer fra publisert versjon

## Bruk av kampoppsett.html

Denne siden er laget for visning av ferdig kampoppsett.

Siden forsøker å lese data i denne rekkefølgen:

1. GitHub
2. lokal fil `kampoppsett.json`
3. lokal cache i nettleseren

Siden viser:

- kampoppsett-tabell
- tabell med første kamp, siste kamp og lengste pause per lag
- kilde, lagret tidspunkt og revisjon

Dette gjør siden egnet som publisert visningsside for deltakere og arrangører.

## Bruk av resultater.html

Denne siden brukes til å registrere resultater og følge poengtabellen.

### Hva siden viser

- kampoppsett-kilde
- resultat-kilde
- lagret tidspunkt
- revisjon
- kamptabell med resultatvalg
- poengtabell

### Knapper på resultater.html

- **Lagre resultater til fil (JSON)** – eksporterer resultater til fil
- **Publiser resultater til GitHub** – lagrer resultater i repository
- **Importer resultater fra fil (JSON)** – leser resultater fra lokal fil
- **Last resultater fra GitHub** – henter resultater fra GitHub-konfigurasjonen
- **Importer kampoppsett fra fil (JSON)** – leser kampoppsett fra lokal fil
- **Last kampoppsett fra GitHub** – henter kampoppsett fra GitHub-konfigurasjonen
- **Nullstill ALLE resultater** – sletter alle lagrede resultater

### Registrering av resultater

Hver kamp har en nedtrekksliste med disse valgene:

- Lag A vinner
- Uavgjort
- Lag B vinner

Poengtabellen oppdateres automatisk når resultater registreres.

## JSON-filer

### Kampoppsett

Et kampoppsett lagres som JSON med blant annet:

- `schedule`
- `teams`
- `savedAt`
- `revision` når tilgjengelig

### Resultater

Resultater lagres som JSON med blant annet:

- `results`
- `savedAt`
- `revision` når tilgjengelig

Eldre JSON-format uten metadata støttes fortsatt, men systemet vil legge til metadata når filen lagres igjen.

## GitHub-funksjoner

Systemet kan både publisere til og laste fra GitHub.

### Kampoppsett på GitHub

Standard konfigurasjon er:

- owner: `KristianMydland`
- repo: `kanonball`
- branch: `main`
- path: `kampoppsett.json`

### Resultater på GitHub

Standard konfigurasjon er:

- owner: `KristianMydland`
- repo: `kanonball`
- branch: `main`
- path: `resultater.json`

### Publisering til GitHub

Når du publiserer:

1. fyller du inn owner, repo, branch og filsti
2. legger inn GitHub token
3. trykker publiser

Ved vellykket publisering lagres ny revisjon fra GitHub-responsen.

### Laste fra GitHub

Når du bruker knappene for å laste fra GitHub:

- systemet bruker lagret GitHub-konfigurasjon
- data hentes fra repository
- data lagres lokalt i nettleseren
- visningen oppdateres

## Publisering på GitHub Pages

1. Opprett eller bruk et GitHub-repository.
2. Last opp alle filene i prosjektet.
3. Gå til **Settings -> Pages**.
4. Velg:
   - Branch: `main`
   - Folder: `/root`
5. Trykk **Save**.

Etter kort tid blir siden tilgjengelig på en URL fra GitHub Pages.

## Anbefalt arbeidsflyt

### Alternativ 1: Lokal drift

1. Åpne `index.html`.
2. Generer kampoppsett.
3. Åpne `resultater.html` under turneringen.
4. Lagre JSON-filer som backup ved behov.

### Alternativ 2: GitHub-basert drift

1. Åpne `index.html`.
2. Generer kampoppsett.
3. Publiser kampoppsett til GitHub.
4. Åpne `kampoppsett.html` for deling eller visning.
5. Åpne `resultater.html` for registrering av resultater.
6. Publiser resultater til GitHub jevnlig.
7. Bruk knappene for å laste siste versjon fra GitHub ved behov.

## Feilsøking

### Kampoppsett vises ikke

Sjekk at:

- `kampoppsett.json` finnes
- GitHub-konfigurasjonen peker til riktig repo og fil
- JSON-filen har gyldig struktur

### Resultater vises ikke

Sjekk at:

- `resultater.json` finnes
- GitHub-konfigurasjonen for resultater er riktig
- JSON-filen har gyldig innhold

### GitHub-publisering feiler

Sjekk at:

- token er gyldig
- token har rettigheter til repository-innhold
- owner, repo, branch og filsti er riktige

### Revisjon vises som ukjent

Dette betyr vanligvis at data kommer fra lokal fil eller gammel lokal cache uten GitHub SHA.

## Teknisk oppsummering

- Ingen backend
- All logikk ligger i HTML, CSS og JavaScript
- Data lagres i nettleserens localStorage og/eller i JSON-filer
- GitHub brukes som delt lagringsplass når ønskelig

