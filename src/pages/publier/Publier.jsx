// Publier une alerte : type, titre, description, position et photo
// (obligatoire). Publiée tout de suite, puis vérifiée par l'IA.
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, HandHeart, MapPin, Megaphone, Package, RefreshCw, X } from 'lucide-react'
import { publierAlerte } from '../../noyau/alertes'
import { preparerPhoto } from '../../noyau/photo'
import { usePosition } from '../../noyau/position'
import { imageBase64 } from '../../noyau/outils'
import { useMessageFlottant, useVibre } from '../../composants/communs'
import CarteMapbox from '../../composants/Carte'

const CHOIX = [
  { type: 'urgence', libelle: 'Urgence', icone: Megaphone, couleur: '#f4545b' },
  { type: 'don', libelle: 'Dons', icone: Package, couleur: '#2ea872' },
  { type: 'service', libelle: 'Services', icone: HandHeart, couleur: '#3fb1e6' },
]

export default function Publier() {
  const naviguer = useNavigate()
  const { position, erreur: erreurPosition, chargement: chercheLieu, actualiser } = usePosition()
  const [type, setType] = useState('urgence')
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState(null)
  const [preparation, setPreparation] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [classe, signaler] = useVibre()
  const [message, afficher] = useMessageFlottant()
  const choixFichier = useRef(null)

  async function choisirPhoto(e) {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    setPreparation(true)
    try {
      setPhoto(await preparerPhoto(fichier, 'entiere'))
    } catch (err) {
      afficher(err.message)
    } finally {
      setPreparation(false)
    }
  }

  async function publier(e) {
    e.preventDefault()
    let ok = true
    if (!titre.trim()) { signaler('titre'); ok = false }
    if (!description.trim()) { signaler('description'); ok = false }
    // La photo est obligatoire pour publier une alerte.
    if (!photo) { signaler('photo'); ok = false }
    if (!ok) return
    if (!position) {
      afficher('Activez la localisation pour publier une alerte près de chez vous.')
      actualiser()
      return
    }
    setEnCours(true)
    try {
      const id = await publierAlerte({ type, titre, description, position, photo })
      naviguer(`/alertes/${id}`, { replace: true })
    } catch (err) {
      afficher(err.message)
      setEnCours(false)
    }
  }

  return (
    <form className="page-etroite publier" onSubmit={publier} noValidate>
      <div className="publier-entete">
        <img src="/images/etoile.png" alt="" />
        <div>
          <h1>Poster une alerte</h1>
          <p className="secondaire">Chaque alerte compte, chaque geste compte.</p>
        </div>
      </div>

      <span className="etiquette">Type d'alerte</span>
      <div className="choix-types">
        {CHOIX.map(({ type: t, libelle, icone: Icone, couleur }) => (
          <button
            type="button"
            key={t}
            className={`choix-type${type === t ? ' choisi' : ''}`}
            style={{ '--couleur': couleur }}
            onClick={() => setType(t)}
            aria-pressed={type === t}
          >
            <Icone size={30} strokeWidth={1.7} />
            {libelle}
          </button>
        ))}
      </div>

      <label className="etiquette" htmlFor="titre">Titre</label>
      <input id="titre" className={`champ${classe('titre')}`} value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={59} placeholder="Ex : Personne en malaise" />

      <label className="etiquette" htmlFor="description">Description</label>
      <textarea id="description" className={`champ${classe('description')}`} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={999} placeholder="Décrivez la situation en quelques mots" />

      <span className="etiquette">Position</span>
      <div className="carte publier-position">
        {position ? (
          <>
            <CarteMapbox centre={[position.longitude, position.latitude]} zoom={15} maPosition={position} hauteur={180} />
            <div className="publier-lieu"><MapPin size={18} color="var(--rouge)" /> {position.libelle}</div>
          </>
        ) : (
          <button type="button" className="publier-lieu" onClick={actualiser}>
            <RefreshCw size={18} /> {chercheLieu ? 'Recherche de votre position...' : erreurPosition}
          </button>
        )}
      </div>

      <span className="etiquette">Photo (obligatoire)</span>
      <div className={`zone-photo${classe('photo')}`}>
        {photo ? (
          <div className="apercu-photo">
            <img src={imageBase64(photo)} alt="Aperçu" />
            <button type="button" className="retirer-photo" onClick={() => setPhoto(null)} aria-label="Retirer la photo"><X size={18} /></button>
          </div>
        ) : (
          <button type="button" className="ajouter-photo" onClick={() => choixFichier.current?.click()} disabled={preparation}>
            <Camera size={30} strokeWidth={1.6} />
            <strong>{preparation ? 'Préparation...' : 'Ajouter une photo'}</strong>
            <span className="indication">Appuyez pour prendre ou choisir une photo</span>
          </button>
        )}
        <input ref={choixFichier} type="file" accept="image/*" hidden onChange={choisirPhoto} />
      </div>

      <button className="bouton large" style={{ marginTop: 26 }} disabled={enCours}>
        {enCours ? 'Publication...' : "Publier l'alerte"}
      </button>
      <p className="indication" style={{ marginTop: 12, textAlign: 'center' }}>
        L'alerte est publiée tout de suite, puis vérifiée automatiquement. Une alerte non conforme (argent, contenu
        sexuel, arnaque...) est retirée.
      </p>
      {message}
    </form>
  )
}
