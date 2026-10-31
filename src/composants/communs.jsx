// Petits composants partagés par toutes les pages.
import { useCallback, useEffect, useRef, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { UserRound } from 'lucide-react'
import { base } from '../noyau/firebase'
import { imageBase64 } from '../noyau/outils'

/** Le nom de l'appli : « Star » en noir, « Pole » en rouge. */
export const Marque = ({ taille = 22 }) => (
  <span className="marque" style={{ fontSize: taille }}>
    Star<span className="pole">Pole</span>
  </span>
)

export const Chargement = () => (
  <div className="chargement">
    <div className="rond-chargement" />
  </div>
)

// Photos des profils déjà lues (pour ne pas les relire à chaque affichage).
const photosLues = new Map()

/** Photo de profil d'une personne (lue dans son profil), ou une silhouette. */
export function Avatar({ id, photo, taille = 44 }) {
  const [image, setImage] = useState(photo ?? photosLues.get(id) ?? null)
  useEffect(() => {
    if (photo !== undefined || !id || photosLues.has(id)) return
    getDoc(doc(base, 'utilisateurs', id))
      .then((s) => {
        const p = s.data()?.photo ?? null
        photosLues.set(id, p)
        setImage(p)
      })
      .catch(() => {})
  }, [id, photo])
  const source = imageBase64(photo !== undefined ? photo : image)
  return (
    <div className="avatar" style={{ width: taille, height: taille }}>
      {source ? <img src={source} alt="" /> : <UserRound size={taille * 0.55} strokeWidth={1.6} />}
    </div>
  )
}

/** Un court message en bas de l'écran (remplace les SnackBar de l'appli). */
export function useMessageFlottant() {
  const [texte, setTexte] = useState(null)
  const minuteur = useRef()
  const afficher = useCallback((t) => {
    clearTimeout(minuteur.current)
    setTexte(t)
    minuteur.current = setTimeout(() => setTexte(null), 3500)
  }, [])
  const element = texte ? <div className="message-flottant" role="status">{texte}</div> : null
  return [element, afficher]
}

/** Fait vibrer et clignoter un champ vide ou invalide (comme l'appli). */
export function useVibre() {
  const [enErreur, setEnErreur] = useState({})
  const signaler = useCallback((nom) => {
    setEnErreur((e) => ({ ...e, [nom]: false }))
    requestAnimationFrame(() => setEnErreur((e) => ({ ...e, [nom]: true })))
    setTimeout(() => setEnErreur((e) => ({ ...e, [nom]: false })), 900)
  }, [])
  const classe = (nom) => (enErreur[nom] ? ' erreur-vibre' : '')
  return [classe, signaler]
}
