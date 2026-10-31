import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const racine = createRoot(document.getElementById('root'))

// Variables lues au moment de la compilation (.env.local, ou réglages Vercel).
const VARIABLES = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
  VITE_MAPBOX_JETON: import.meta.env.VITE_MAPBOX_JETON,
}
const manquantes = Object.entries(VARIABLES)
  .filter(([, valeur]) => !valeur)
  .map(([nom]) => nom)

if (manquantes.length) {
  // Plutôt qu'une page blanche : dire clairement ce qui manque (seulement
  // les noms, jamais de valeur).
  racine.render(
    <div className="page-etroite" style={{ paddingTop: 60 }}>
      <h1>Configuration incomplète</h1>
      <p className="secondaire" style={{ margin: '12px 0' }}>
        Le site a été compilé sans ces variables d'environnement. Ajoutez-les dans les réglages de l'hébergeur
        (Vercel : Settings, puis Environment Variables), puis relancez le déploiement.
      </p>
      <ul>
        {manquantes.map((nom) => (
          <li key={nom}><code>{nom}</code></li>
        ))}
      </ul>
    </div>,
  )
} else {
  import('./App.jsx').then(({ default: App }) =>
    racine.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
}
