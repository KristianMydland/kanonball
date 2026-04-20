# Lauvåsen IF – Kanonballturnering 2026

Dette er et komplett webbasert system for å generere kampoppsett, registrere resultater og vise poengtabell for en kanonballturnering.

Systemet består av tre sider:

- **index.html** – Genererer kampoppsett, lagrer til LocalStorage, import/eksport av JSON.
- **kampoppsett.html** – Viser lagret kampoppsett.
- **resultater.html** – Registrerer resultater, viser poengtabell, import/eksport, nullstilling.

## Funksjoner

- Automatisk kampoppsett (round robin)
- Anti back‑to‑back kamper
- 2–1–0 poengsystem
- Live oppdatert poengtabell
- Nullstilling av enkeltkamper
- Nullstilling av alle resultater (med bekreftelse)
- Import/eksport av kampoppsett og resultater (JSON)
- Dark mode
- Fargekoder for lag
- Fullt statisk – ingen backend nødvendig

## Publisering på GitHub Pages

1. Opprett et nytt repository på GitHub  
2. Last opp alle filene i denne mappen  
3. Gå til **Settings → Pages**  
4. Under *Source*, velg:
   - Branch: `main`
   - Folder: `/root`
5. Trykk **Save**

Etter 10–20 sekunder får du en URL som:

