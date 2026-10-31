// En-tête avec le logo et la navigation (en haut sur ordinateur, en bas sur
// téléphone comme l'appli), puis la page affichée.
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { House, Map, MessageCircle, Plus, UserRound } from 'lucide-react'
import { useAuth } from '../noyau/auth'
import { useConversations } from '../noyau/messagerie'
import { Chargement, Marque } from '../composants/communs'

function Lien({ vers, icone: Icone, texte, classe = '', pastille = false }) {
  return (
    <NavLink to={vers} end={vers === '/'} className={({ isActive }) => `${classe}${isActive ? ' actif' : ''}`}>
      <Icone size={20} strokeWidth={1.8} />
      <span>{texte}</span>
      {pastille && <i className="pastille-nonlu" aria-label="Messages non lus" />}
    </NavLink>
  )
}

export default function MiseEnPage() {
  const { utilisateur, chargement } = useAuth()
  const conversations = useConversations(utilisateur?.uid)
  const lieu = useLocation()
  if (chargement) return <Chargement />
  // Le site demande d'être connecté, comme l'appli.
  if (!utilisateur) return <Navigate to="/connexion" replace state={{ depuis: lieu.pathname }} />
  const nonLus = (conversations || []).some((c) => c.nonLu)
  return (
    <>
      <header className="entete">
        <div className="entete-interieur">
          <Link to="/" className="logo">
            <img src="/images/etoile.png" alt="" />
            <Marque />
          </Link>
          <nav className="navigation">
            <Lien vers="/" icone={House} texte="Accueil" />
            <Lien vers="/carte" icone={Map} texte="Carte" />
            <Lien vers="/publier" icone={Plus} texte="Publier" classe="publier" />
            <Lien vers="/messages" icone={MessageCircle} texte="Messages" pastille={nonLus} />
            <Lien vers="/profil" icone={UserRound} texte="Profil" />
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  )
}
