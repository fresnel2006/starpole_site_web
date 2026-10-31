// Une alerte dans une liste : photo (cadrée en 2 pour 1), titre, lieu, âge,
// type et état.
import { Link } from 'react-router-dom'
import { Clock, MapPin } from 'lucide-react'
import { TYPES } from '../noyau/alertes'
import { distanceKm, imageBase64, libelleDistance, tempsEcoule } from '../noyau/outils'

export function PuceType({ type }) {
  const classe = type === 'urgence' ? 'rouge' : type === 'don' ? 'verte' : 'bleue'
  return <span className={`puce ${classe}`}>{TYPES[type].libelle}</span>
}

export function PuceStatut({ alerte }) {
  if (alerte.statut === 'resolue') return <span className="puce verte">Résolue</span>
  if (alerte.aidantId) return <span className="puce grise">Prise en charge</span>
  return <span className="puce rouge">En cours</span>
}

export default function CarteAlerte({ alerte, position }) {
  const distance =
    position && alerte.latitude != null
      ? distanceKm(position.latitude, position.longitude, alerte.latitude, alerte.longitude)
      : null
  const photo = imageBase64(alerte.photo)
  return (
    <Link to={`/alertes/${alerte.id}`} className="carte carte-alerte">
      <div className="carte-alerte-photo">
        {photo ? <img src={photo} alt="" loading="lazy" /> : <div className="sans-photo" />}
        <div className="carte-alerte-puces">
          <PuceType type={alerte.type} />
          <PuceStatut alerte={alerte} />
        </div>
      </div>
      <div className="carte-alerte-texte">
        <h3>{alerte.categorie}</h3>
        <p className="secondaire ligne-coupee">{alerte.description}</p>
        <div className="carte-alerte-infos">
          <span>
            <MapPin size={15} strokeWidth={1.8} />
            {alerte.quartier ? `${alerte.quartier}, ${alerte.ville}` : alerte.ville}
            {distance != null && ` · ${libelleDistance(distance)}`}
          </span>
          <span>
            <Clock size={15} strokeWidth={1.8} />
            {tempsEcoule(alerte.creeLe)}
          </span>
        </div>
      </div>
    </Link>
  )
}
