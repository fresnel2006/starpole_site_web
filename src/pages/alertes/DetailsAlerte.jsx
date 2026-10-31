// Détails d'une alerte : photo entière, lieu, carte, et les actions (aider,
// suivi, itinéraire, partage, écrire à l'auteur).
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Clock, Crosshair, HandHeart, MapPin, MessageCircle, Navigation, Share2, ListChecks } from 'lucide-react'
import { aider, lienItineraire, texteDePartage, useAlerte } from '../../noyau/alertes'
import { useAuth } from '../../noyau/auth'
import { ouvrirConversation } from '../../noyau/messagerie'
import { usePosition } from '../../noyau/position'
import { distanceKm, imageBase64, libelleDistance, tempsEcoule } from '../../noyau/outils'
import { Avatar, Chargement, useMessageFlottant } from '../../composants/communs'
import { PuceStatut, PuceType } from '../../composants/CarteAlerte'
import CarteMapbox from '../../composants/Carte'

export default function DetailsAlerte() {
  const { id } = useParams()
  const alerte = useAlerte(id)
  const { utilisateur, nom } = useAuth()
  const { position } = usePosition()
  const naviguer = useNavigate()
  const [enCours, setEnCours] = useState(false)
  const [message, afficher] = useMessageFlottant()

  if (alerte === undefined) return <Chargement />
  if (alerte === null) {
    return (
      <div className="page-etroite">
        <button className="retour" onClick={() => naviguer(-1)}><ArrowLeft size={20} /> Détails de l'alerte</button>
        <p className="vide">Cette alerte n'existe plus.</p>
      </div>
    )
  }

  const moi = utilisateur.uid
  const estAuteur = alerte.auteurId === moi
  const estAidant = alerte.aidantId === moi
  const aPosition = alerte.latitude != null && alerte.longitude != null
  const distance = position && aPosition ? distanceKm(position.latitude, position.longitude, alerte.latitude, alerte.longitude) : null

  async function jePeuxAider() {
    setEnCours(true)
    try {
      await aider(alerte.id)
      naviguer(`/alertes/${alerte.id}/suivi`)
    } catch (e) {
      afficher(e.message)
    } finally {
      setEnCours(false)
    }
  }

  async function partager() {
    const texte = texteDePartage(alerte)
    if (navigator.share) {
      navigator.share({ text: texte }).catch(() => {})
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(texte)}`, '_blank', 'noopener')
    }
  }

  async function ecrireAuteur() {
    try {
      const conversation = await ouvrirConversation({ id: alerte.auteurId, nom: alerte.auteurNom }, nom)
      naviguer(`/messages/${conversation}`)
    } catch {
      afficher('Impossible d\'ouvrir la conversation. Vérifiez votre connexion.')
    }
  }

  let principal
  if (alerte.statut === 'resolue') {
    principal = <button className="bouton gris large"><CheckCircle2 size={20} /> Alerte résolue</button>
  } else if (estAuteur || estAidant) {
    principal = <Link to={`/alertes/${alerte.id}/suivi`} className="bouton vert large"><ListChecks size={20} /> Voir le suivi</Link>
  } else if (!alerte.aidantId) {
    principal = (
      <button className="bouton vert large" onClick={jePeuxAider} disabled={enCours}>
        <HandHeart size={20} /> {enCours ? 'Un instant...' : 'Je peux aider'}
      </button>
    )
  } else {
    principal = <button className="bouton gris large"><HandHeart size={20} /> Déjà prise en charge</button>
  }

  const photo = imageBase64(alerte.photo)
  return (
    <div className="page details">
      <button className="retour" onClick={() => naviguer(-1)}><ArrowLeft size={20} /> Détails de l'alerte</button>
      <div className="details-grille">
        <div>
          {photo && <img className="details-photo" src={photo} alt={alerte.categorie} />}
          {aPosition && (
            <div className="carte details-carte">
              <CarteMapbox alertes={[alerte]} centre={[alerte.longitude, alerte.latitude]} zoom={14.5} maPosition={position} hauteur={260} />
            </div>
          )}
        </div>
        <div>
          <div className="details-puces">
            <PuceType type={alerte.type} />
            <PuceStatut alerte={alerte} />
          </div>
          <h1 style={{ marginTop: 12 }}>{alerte.categorie}</h1>
          <p className="details-description">{alerte.description}</p>
          <ul className="details-infos">
            <li><MapPin size={20} />{alerte.quartier ? `${alerte.quartier}, ${alerte.ville}` : alerte.ville}</li>
            <li><Clock size={20} />{tempsEcoule(alerte.creeLe)}</li>
            {distance != null && <li><Crosshair size={20} />{libelleDistance(distance)}</li>}
            {alerte.aidantNom && alerte.statut === 'en_cours' && (
              <li className="vert-texte"><HandHeart size={20} />{alerte.aidantNom} aide</li>
            )}
          </ul>
          <div className="details-actions">
            {principal}
            {aPosition && (
              <a className="bouton contour-vert large" href={lienItineraire(alerte)} target="_blank" rel="noreferrer">
                <Navigation size={20} /> Itinéraire
              </a>
            )}
            <button className="bouton contour-vert large" onClick={partager}><Share2 size={20} /> Partager</button>
          </div>
          <button className="signale-par" onClick={estAuteur ? undefined : ecrireAuteur} disabled={estAuteur}>
            <Avatar id={alerte.auteurId} taille={52} />
            <div>
              <p className="secondaire">Signalé par</p>
              <strong>{estAuteur ? `${alerte.auteurNom} (vous)` : alerte.auteurNom}</strong>
            </div>
            {!estAuteur && <MessageCircle size={24} color="var(--rouge)" style={{ marginLeft: 'auto' }} />}
          </button>
        </div>
      </div>
      {message}
    </div>
  )
}
