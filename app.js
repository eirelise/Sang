// Importerer innebygd 'path' for trygg håndtering av filstier på tvers av OS
const path = require('path'); // Brukes til å lage korrekte stier til views, public og databasefil

// Importerer Express-rammeverket
const express = require('express'); // Gjør det enkelt å lage HTTP-server og ruter

// Importerer SQLite3-driveren for Node.js
const sqlite3 = require('sqlite3').verbose(); // Lar oss koble til og kjøre SQL mot en lokal SQLite-fil

// Lager en ny Express-applikasjon
const app = express(); // Initialiserer Express-appen

// Setter portnummeret som serveren skal lytte på
const PORT = 3000; // Standard port for lokal utvikling

// Åpner/oppretter SQLite-databasefilen 'app.db' i prosjektmappen


const db = new sqlite3.Database(path.join(__dirname, 'users.db')); // Oppretter/åpner databasefilen der data lagres

// Oppretter 'users'-tabellen hvis den ikke finnes fra før
db.serialize(() => { // Sørger for at SQL-kommandoer kjører i rekkefølge
  db.run(` -- Starter SQL for å lage tabellen
    CREATE TABLE IF NOT EXISTS users (               -- Lager tabellen bare hvis den ikke finnes
    userid integer unique not null primary key autoincrement,
    username text unique not null check(length(username)>=3),
    email text unique not null,
    password text not null,
    created_at datetime not null default current_timestamp                -- Dato i format YYYY-MM-DD (påkrevd)
    )
                                  -- Slutt på CREATE TABLE
  `); // Avslutter kjøringen av SQL-setningen
}); // Avslutter serialize-blokk
// Setter EJS som templatemotor
app.set('view engine', 'ejs'); // Forteller Express at .ejs-filer skal rendre HTML

// Angir mappen som inneholder EJS-visningene
app.set('views', path.join(__dirname, 'views')); // Sikrer korrekt sti til 'views'-mappen

// Gjør statiske filer tilgjengelig (f.eks. CSS) fra 'public'-mappen
app.use(express.static(path.join(__dirname, 'public'))); // Lar nettleseren hente /styles.css osv.

// Aktiverer parsing av URL-enkodede skjemaer (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true })); // Lar oss lese req.body ved POST fra HTML-skjema

// Hjelpefunksjon: kjør SELECT som henter flere rader (Promise-basert)
function dbAll(sql, params = []) { // Definerer en funksjon for å kjøre SELECT som returnerer flere rader
  return new Promise((resolve, reject) => { // Returnerer et Promise for å kunne bruke async/await
    db.all(sql, params, (err, rows) => { // Kjører spørringen med parametere
      if (err) return reject(err); // Avviser Promise hvis SQL-feil oppstår
      resolve(rows); // Løser Promise med resultat-radene
    }); // Avslutter callback for db.all
  }); // Avslutter Promise
} // Avslutter funksjonen dbAll

// Hjelpefunksjon: kjør INSERT/UPDATE/DELETE (Promise-basert)
function dbRun(sql, params = []) { // Definerer en funksjon for å kjøre skrivende spørringer
  return new Promise((resolve, reject) => { // Returnerer et Promise
    db.run(sql, params, function (err) { // Kjører spørringen og beholder 'this' for lastID/changes
      if (err) return reject(err); // Avviser Promise ved SQL-feil
      resolve(this); // Løser Promise med 'this' (inneholder lastID for INSERT)
    }); // Avslutter callback for db.run
  }); // Avslutter Promise
} // Avslutter funksjonen dbRun


app.get('/', async (req, res) => { // Definerer rute for å vise startsiden
  try { // Starter try/catch for feilhandtering
    const users = await dbAll( // Henter alle brukere fra databasen
      'SELECT userid, username, email FROM users ORDER BY userid DESC', // SQL for å liste brukere
      [] // Ingen parametere for denne spørringen
    ); // Avslutter henting av brukere
    res.render('index', { title: 'Registrer sanger', users, message: null }); // Renderer index.ejs med data
  } catch (err) { // Fanger eventuelle feil
    console.error(err); // Logger feilen i konsollen
    res.status(500).send('Noe gikk galt.'); // Sender en enkel feilmelding til klienten
  } // Avslutter try/catch
}); // Avslutter GET-ruten


// POST /users - validerer og lagrer en ny bruker i databasen
app.post('/users', async (req, res) => { // Definerer rute for innsending av nytt brukerskjema
  try { // Starter try/catch for å håndtere feil
    const { username, email } = req.body; // Leser ut feltene fra skjemaet
    if (!username || !email) { // Sjekker at alle felt er utfylt
      const users = await dbAll('SELECT userid, username, email FROM users ORDER BY userid DESC'); // Henter liste for visning ved feil
      return res.status(400).render('login', { title: 'Registrer sanger', users, message: 'Fyll ut brukernavn og e-post.' }); // Viser feilmelding
    } // Avslutter validering for tomme felt
    if (!/^\d{4}-\d{2}-\d{2}$/.test(listened_date)) { // Sjekker at dato har format YYYY-MM-DD
      const users = await dbAll('SELECT userid, username, email FROM users ORDER BY userid DESC'); // Henter liste for visning ved feil
      return res.status(400).render('login', { title: 'Register User', users, message: 'Date must be in format YYYY-MM-DD.' }); // Viser feilmelding om datoformat
    } // Avslutter datoformat-sjekk
    await dbRun( // Kjører INSERT for å lagre sangen
      'INSERT INTO users (username, email) VALUES (?, ?)', // SQL med parametere
      [username.trim(), email.trim()] // Verdier å sette inn (trim fjerner ekstra mellomrom)
    ); // Avslutter INSERT
    res.redirect('/'); // Sender brukeren tilbake til forsiden for å se oppdatert liste
  } catch (err) { // Fanger uventede feil
    console.error(err); // Logger feilen
    const users = await dbAll('SELECT userid, username, email FROM users ORDER BY userid DESC'); // Henter liste for visning ved feil
    res.status(500).render('login', { title: 'Register User', users, message: 'Kunne ikke lagre brukeren.' }); // Viser generell feilmelding
  } // Avslutter try/catch
}); // Avslutter POST-ruten

// Definerer login-rute "/login"
app.get('/login', (req, res) => { // Håndterer GET-forespørsler til "/login"
  res.render('login', { title: 'Logg inn' }); // Rendre views/login.ejs og send inn title-variabelen
}); // Avslutter login-ruten

app.get('/register', (req, res) => {
  res.render('register', { title: 'Registrer bruker' });
});

app.get('/chat', (req, res) => {
  res.render('chat', { title: 'Chat' });
});

// Starter serveren
app.listen(PORT, () => { // Ber Express lytte på definert port
  console.log(`Server kjører på http://localhost:${PORT}`); // Logger URL for lett tilgang i nettleser
}); // Avslutter app.listen