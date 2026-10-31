// Carte des alertes d'Abidjan, avec un filtre par type. Toucher un repère
// montre un résumé et un lien vers les détails.
import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, X } from 'lucide-react'
import { useAlertes } from '../../noyau/alertes'
import { usePosition } from '../../noyau/position'
import { tempsEcoule } from '../../noyau/outils'
import CarteMapbox from '../../composants/Carte'
import { PuceStatut, PuceType } from '../../composants/CarteAlerte'

const FILTRES = [
  [null, 'Toutes'],
  ['urgence', 'Urgences'],
  ['don', 'Dons'],
  ['service', 'Services'],
]

export default function Carte() {
  const { liste } = useAlertes()
  const { position } = usePosition()
  const [filtre, setFiltre] = useState(null)
  const [choisie, setChoisie] = useState(null)
  const visibles = useMemo(
    () => (liste || []).filter((a) => a.statut === 'en_cours' && (!filtre || a.type === filtre)),
    [liste, filtre],
  )
  const choisir = useCallback((a) => setChoisie(a), [])

  return (
    <div className="page-carte">
      <div className="carte-filtres">
        {FILTRES.map(([type, libelle]) => (
          <button key={libelle} className={`filtre${filtre === type ? ' actif' : ''}`} onClick={() => setFiltre(type)}>
            {libelle}
          </button>
        ))}
      </div>
      <CarteMapbox alertes={visibles} auChoix={choisir} maPosition={position} relief zoom={12.5} hauteur="100%" />
      {choisie && (
        <div className="carte carte-resume">
          <button className="fermer" onClick={() => setChoisie(null)} aria-label="Fermer"><X size={18} /></button>
          <div className="details-puces"><PuceType type={choisie.type} /><PuceStatut alerte={choisie} /></div>
          <h3 style={{ marginTop: 8 }}>{choisie.categorie}</h3>
          <p className="indication"><MapPin size={14} style={{ verticalAlign: -2 }} /> {choisie.quartier ?? choisie.ville} · {tempsEcoule(choisie.creeLe)}</p>
          <Link className="bouton large" style={{ marginTop: 12 }} to={`/alertes/${choisie.id}`}>Voir les détails</Link>
        </div>
      )}
    </div>
  )
}
