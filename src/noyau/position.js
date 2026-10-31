// Position de la personne, via le navigateur (il demande l'autorisation).
import { useCallback, useEffect, useState } from 'react'
import { lieuDepuis } from './outils'

const MESSAGES = {
  1: 'Autorisez la localisation dans votre navigateur pour voir les alertes près de vous.',
  2: 'Position introuvable. Vérifiez que la localisation est activée.',
  3: 'La localisation met trop de temps. Réessayez.',
}

export function chercherPosition() {
  return new Promise((resoudre, rejeter) => {
    if (!navigator.geolocation) {
      rejeter(new Error("Ce navigateur ne donne pas la position."))
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const lieu = lieuDepuis(coords.latitude, coords.longitude)
        resoudre({
          latitude: coords.latitude,
          longitude: coords.longitude,
          ville: lieu?.ville ?? 'Position actuelle',
          quartier: lieu?.quartier ?? null,
          libelle: lieu ? `${lieu.ville}, ${lieu.quartier}` : 'Position actuelle',
        })
      },
      (e) => rejeter(new Error(MESSAGES[e.code] || MESSAGES[2])),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    )
  })
}

/** Hook : la position (ou une erreur), cherchée une fois à l'ouverture. */
export function usePosition() {
  const [etat, setEtat] = useState({ chargement: true, position: null, erreur: null })
  const actualiser = useCallback(() => {
    setEtat((e) => ({ ...e, chargement: true }))
    chercherPosition()
      .then((position) => setEtat({ chargement: false, position, erreur: null }))
      .catch((e) => setEtat({ chargement: false, position: null, erreur: e.message }))
  }, [])
  useEffect(() => {
    actualiser()
  }, [actualiser])
  return { ...etat, actualiser }
}
