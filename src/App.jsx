// Les pages du site StarPole.
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { FournisseurAuth } from './noyau/auth'
import MiseEnPage from './application/MiseEnPage'
import Connexion from './pages/connexion/Connexion'
import TexteLegal from './pages/legal/TexteLegal'
import Accueil from './pages/accueil/Accueil'
import DetailsAlerte from './pages/alertes/DetailsAlerte'
import SuiviAlerte from './pages/alertes/SuiviAlerte'
import Publier from './pages/publier/Publier'
import Carte from './pages/carte/Carte'
import Messages from './pages/messages/Messages'
import Conversation from './pages/messages/Conversation'
import Profil from './pages/profil/Profil'
import './pages/pages.css'

export default function App() {
  return (
    <FournisseurAuth>
      <BrowserRouter>
        <Routes>
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/legal/:texte" element={<TexteLegal />} />
          <Route element={<MiseEnPage />}>
            <Route path="/" element={<Accueil />} />
            <Route path="/alertes/:id" element={<DetailsAlerte />} />
            <Route path="/alertes/:id/suivi" element={<SuiviAlerte />} />
            <Route path="/publier" element={<Publier />} />
            <Route path="/carte" element={<Carte />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:id" element={<Conversation />} />
            <Route path="/profil" element={<Profil />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </FournisseurAuth>
  )
}
