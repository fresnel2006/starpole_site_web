// Accueil : position, recherche, tri par catégorie et alertes à proximité.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { HandHeart, MapPin, Megaphone, Package, Search, Zap } from 'lucide-react'
import { useAlertes } from '../../noyau/alertes'
import { usePosition } from '../../noyau/position'
import { useAuth } from '../../noyau/auth'
import CarteAlerte from '../../composants/CarteAlerte'
import { Avatar, Chargement } from '../../composants/communs'

const TUILES = [
  { type: 'urgence', libelle: 'Voir les urgences', icone: Megaphone, couleur: 'var(--rouge)' },
  { type: 'service', libelle: 'Voir les aides', icone: HandHeart, couleur: 'var(--vert)' },
  { type: 'don', libelle: 'Voir les dons', icone: Package, couleur: 'var(--bleu)' },
]

export default function Accueil() {
  const { utilisateur, profil, nom } = useAuth()
  const { liste, erreur } = useAlertes()
  const { position, erreur: erreurPosition, chargement: chercheLieu, actualiser } = usePosition()
  const [filtre, setFiltre] = useState(null)
  const [recherche, setRecherche] = useState('')

  // Les alertes en cours de ma ville (toutes si la ville n'est pas connue).
  const proches = useMemo(() => {
    const mot = recherche.trim().toLowerCase()
    return (liste || []).filter(
      (a) =>
        a.statut === 'en_cours' &&
        (!filtre || a.type === filtre) &&
        (!position || !a.ville || a.ville === position.ville) &&
        (!mot || `${a.categorie} ${a.description} ${a.quartier ?? ''}`.toLowerCase().includes(mot)),
    )
  }, [liste, filtre, position, recherche])

  return (
    <>
      <section className="accueil-bandeau">
        <img src="/images/abidjan.jpg" alt="" />
        <div className="accueil-bandeau-voile" />
        <div className="page accueil-bandeau-contenu">
          <div className="accueil-salut">
            <Avatar id={utilisateur.uid} photo={profil?.photo ?? null} taille={52} />
            <div>
              <p className="secondaire">Bonjour</p>
              <h1>{nom}</h1>
            </div>
          </div>
          <button className="accueil-lieu" onClick={erreurPosition ? actualiser : undefined}>
            <MapPin size={18} strokeWidth={2} color="var(--rouge)" />
            {chercheLieu ? 'Recherche de votre position...' : position ? position.libelle : erreurPosition}
          </button>
          <label className="recherche">
            <Search size={18} strokeWidth={1.8} />
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher une alerte, une aide, un don..." />
          </label>
        </div>
      </section>

      <div className="page" style={{ paddingTop: 8 }}>
        <div className="titre-section">
          <Zap size={22} color="var(--rouge)" />
          <h2>Types d'alerte</h2>
        </div>
        <div className="tuiles">
          {TUILES.map(({ type, libelle, icone: Icone, couleur }) => {
            const choisie = filtre === type
            return (
              <button
                key={type}
                className={`tuile${choisie ? ' choisie' : ''}${filtre && !choisie ? ' estompee' : ''}`}
                style={{ background: couleur }}
                onClick={() => setFiltre(choisie ? null : type)}
                aria-pressed={choisie}
              >
                <Icone size={40} strokeWidth={1.6} />
                <span>{libelle}</span>
              </button>
            )
          })}
        </div>

        <div className="titre-section" style={{ marginTop: 34 }}>
          <MapPin size={22} />
          <h2>Alertes à proximité</h2>
          <span className="badge-nombre">
            {liste === null ? '...' : `${proches.length} ${proches.length > 1 ? 'alertes' : 'alerte'}`}
          </span>
        </div>

        {erreur ? (
          <p className="vide">{erreur}</p>
        ) : liste === null ? (
          <Chargement />
        ) : proches.length === 0 ? (
          <div className="vide">
            <p>{filtre ? 'Aucune alerte de ce type près de chez vous pour le moment.' : 'Aucune alerte près de chez vous pour le moment.'}</p>
            <Link to="/publier" className="bouton" style={{ marginTop: 18 }}>Publier une alerte</Link>
          </div>
        ) : (
          <div className="grille-alertes">
            {proches.map((a) => (
              <CarteAlerte key={a.id} alerte={a} position={position} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
