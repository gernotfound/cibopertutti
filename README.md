# 🍔 CiboPerTutti

**CiboPerTutti** è un'applicazione web mobile-first pensata per risolvere il classico problema delle ordinazioni di gruppo. Niente più foglietti di carta o chat caotiche su WhatsApp: una persona crea un "Tavolo", definisce il menù e condivide il link. Gli amici entrano, scelgono cosa vogliono mangiare, e l'app calcola in tempo reale il totale esatto delle quantità necessarie per ogni pietanza.

## 📖 Come funziona il sito? (Guida all'uso)

L'applicazione è progettata per essere estremamente semplice e intuitiva, dividendosi in due ruoli principali:

### 1. Il Capo (Chi organizza la cena)
- **Creazione Tavolo**: Accedi con Google e clicca su "Crea Tavolo".
- **Composizione del Menù**: Aggiungi i cibi o le bevande che saranno disponibili per la serata (es. "Salsiccia", "Bistecca", "Birra"). Puoi personalizzare il menù per ogni singolo tavolo.
- **Invito**: Una volta creato il tavolo, premi il tasto **"🔗 Invita"** per copiare un link speciale e inviarlo nel gruppo WhatsApp dei tuoi amici.
- **Riepilogo e Gestione**: Il Capo può vedere in tempo reale chi si aggiunge al tavolo, controllare cosa hanno scelto e, una volta che tutti hanno ordinato, vedere il "TOTALE" esatto degli ingredienti da comprare (es. 10 Salsicce, 5 Bistecche).

### 2. Il Partecipante (Chi viene alla cena)
- **Accesso Rapido**: Cliccando sul link di invito ricevuto dal Capo, verrai subito proiettato all'interno del tavolo (dopo un veloce login con Google).
- **Ordinazione**: Vedrai il menù scelto dal Capo. Ti basterà usare i comodi pulsanti `+` e `-` per indicare quante porzioni vuoi per ogni pietanza.
- **Salvataggio e Riepilogo**: Clicca su "Salva" e le tue scelte verranno inviate istantaneamente. Potrai poi consultare la schermata del "Riepilogo" per sbirciare cosa hanno preso gli altri amici e vedere il conto totale dell'evento.
- **Niente stress**: Se cambi idea, puoi sempre modificare le tue quantità finché il tavolo è aperto, o cliccare in fondo su "Eliminami dal tavolo" per annullare del tutto la tua partecipazione.

## 🛠️ Tecnologie Utilizzate

- **Frontend**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Cloud Firestore)
- **Styling**: Vanilla CSS (UI Mobile-First anti-zoom progettata per restituire il *feeling* di un'app nativa)
- **Deploy**: Pipeline automatica su GitHub Pages tramite GitHub Actions

## 🔐 Sicurezza, Database e Limitazioni Locali

Il progetto utilizza Firebase con un'architettura Serverless. Le API Key presenti nel codice sorgente sono pubbliche (come previsto dalle architetture client-side di Firebase), ma il database è blindato tramite due livelli di sicurezza:
1. **Firebase Security Rules**: Solo il "Capo" può modificare il menù di un tavolo, e ogni utente può salvare esclusivamente le proprie scelte, impedendo a chiunque di modificare i voti altrui.
2. **Restrizioni di Dominio (HTTP Referrer)**: Le API Key sono configurate per funzionare **esclusivamente dal dominio ufficiale del sito**. 

> ⚠️ **Nota per gli sviluppatori**: A causa delle restrizioni di dominio per la sicurezza del database, **clonare questo repository e avviarlo in locale (`npm run dev`) non funzionerà**. Le chiamate al database da `localhost` verranno bloccate da Google Cloud. Per eseguire il progetto in locale, è necessario creare un proprio progetto Firebase indipendente e sostituire le API Key nel file `src/firebase.js`.

---
*Progettato per rendere le cene di gruppo semplici e senza stress.*
