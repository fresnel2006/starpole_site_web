// Les alertes (urgences, dons, services) : mêmes données et mêmes règles que
// l'appli mobile (collection `alertes`, sous-collection `progression`).
import { useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { auth, base } from './firebase'
import { envoyerAuServeur } from './serveur'
import { enDate } from './outils'

export const TYPES = {
  urgence: { libelle: 'Urgence', pluriel: 'urgences', couleur: '#E3060B' },
  service: { libelle: 'Services', pluriel: 'aides', couleur: '#00AEFF' },
  don: { libelle: 'Dons', pluriel: 'dons', couleur: '#0B7A4B' },
}

const alertesRef = collection(base, 'alertes')

function depuis(instantane) {
  const d = instantane.data()
  return {
    id: instantane.id,
    ...d,
    type: TYPES[d.type] ? d.type : 'urgence',
    statut: d.statut === 'resolue' ? 'resolue' : 'en_cours',
    creeLe: enDate(d.creeLe) ?? new Date(),
    accepteLe: enDate(d.accepteLe),
    termineLe: enDate(d.termineLe),
  }
}

const nomActuel = () => auth.currentUser?.displayName?.trim() || 'Utilisateur'

/** Hook générique : écoute une requête Firestore et renvoie la liste. */
function useListe(fabriquer, dependances) {
  const [etat, setEtat] = useState({ liste: null, erreur: null })
  useEffect(() => {
    const requete = fabriquer()
    if (!requete) {
      setEtat({ liste: [], erreur: null })
      return undefined
    }
    return onSnapshot(
      requete,
      (s) => setEtat({ liste: s.docs.map(depuis), erreur: null }),
      () => setEtat({ liste: [], erreur: 'Impossible de charger les alertes. Vérifiez votre connexion.' }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependances)
  return etat
}

/** Les 50 alertes les plus récentes. */
export const useAlertes = () =>
  useListe(() => query(alertesRef, orderBy('creeLe', 'desc'), limit(50)), [])

/** Mes alertes : publiées par moi ou que j'aide. */
export function useMesAlertes(uid) {
  const publiees = useListe(() => uid && query(alertesRef, where('auteurId', '==', uid)), [uid])
  const aidees = useListe(() => uid && query(alertesRef, where('aidantId', '==', uid)), [uid])
  if (publiees.liste === null || aidees.liste === null) return { liste: null }
  const parId = new Map([...publiees.liste, ...aidees.liste].map((a) => [a.id, a]))
  return {
    liste: [...parId.values()].sort((a, b) => b.creeLe - a.creeLe),
    erreur: publiees.erreur || aidees.erreur,
  }
}

/** Une alerte en direct (null si elle n'existe plus, undefined pendant le chargement). */
export function useAlerte(id) {
  const [alerte, setAlerte] = useState(undefined)
  useEffect(
    () =>
      onSnapshot(
        doc(base, 'alertes', id),
        (s) => setAlerte(s.exists() ? depuis(s) : null),
        () => setAlerte(null),
      ),
    [id],
  )
  return alerte
}

/** Les messages d'avancement d'une alerte, du plus ancien au plus récent. */
export function useProgression(id) {
  const [liste, setListe] = useState([])
  useEffect(
    () =>
      onSnapshot(
        query(collection(base, 'alertes', id, 'progression'), orderBy('creeLe')),
        (s) => setListe(s.docs.map((d) => ({ id: d.id, ...d.data(), creeLe: enDate(d.data().creeLe) ?? new Date() }))),
        () => setListe([]),
      ),
    [id],
  )
  return liste
}

/** Publie une alerte. Elle est en ligne tout de suite ; ensuite le serveur la
 * fait vérifier par l'IA et la retire si elle n'est pas conforme. */
export async function publierAlerte({ type, titre, description, position, photo }) {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Connectez-vous pour publier une alerte.')
  let ref
  try {
    ref = await addDoc(alertesRef, {
      type,
      categorie: titre.trim(),
      description: description.trim(),
      ville: position?.ville ?? 'Abidjan',
      quartier: position?.quartier ?? null,
      latitude: position?.latitude ?? null,
      longitude: position?.longitude ?? null,
      auteurId: uid,
      auteurNom: nomActuel(),
      statut: 'en_cours',
      creeLe: serverTimestamp(),
      aidantId: null,
      aidantNom: null,
      accepteLe: null,
      termineLe: null,
      photo: photo ?? null,
    })
  } catch {
    throw new Error("Impossible de publier l'alerte. Vérifiez votre connexion.")
  }
  // Vérification en arrière-plan : on n'attend pas la réponse.
  auth.currentUser
    .getIdToken()
    .then((jeton) => envoyerAuServeur('/moderation/alerte', { alerteId: ref.id }, jeton))
    .catch(() => {})
  return ref.id
}

export async function aider(id) {
  try {
    await updateDoc(doc(base, 'alertes', id), {
      aidantId: auth.currentUser.uid,
      aidantNom: nomActuel(),
      accepteLe: serverTimestamp(),
    })
  } catch (e) {
    throw new Error(
      e.code === 'permission-denied'
        ? "Cette alerte est déjà prise en charge par quelqu'un d'autre."
        : "Impossible d'accepter l'alerte. Vérifiez votre connexion.",
    )
  }
}

/** Seul l'auteur termine son alerte. */
export async function terminer(id) {
  await updateDoc(doc(base, 'alertes', id), { statut: 'resolue', termineLe: serverTimestamp() })
}

/** La personne qui aide s'arrête : l'alerte redevient libre pour les autres. */
export async function arreterDAider(id) {
  await ecrireProgression(id, "J'arrête d'aider. L'alerte reste ouverte pour les autres.").catch(() => {})
  await updateDoc(doc(base, 'alertes', id), { aidantId: null, aidantNom: null, accepteLe: null })
}

export async function ecrireProgression(id, texte) {
  await addDoc(collection(base, 'alertes', id, 'progression'), {
    texte: texte.trim(),
    auteurId: auth.currentUser.uid,
    auteurNom: nomActuel(),
    creeLe: serverTimestamp(),
  })
}

/** Lien de partage (WhatsApp...) : titre, description, lieu et carte. */
export function texteDePartage(a) {
  return [
    `Alerte StarPole : ${a.categorie}`,
    a.description,
    a.quartier ? `Lieu : ${a.quartier}, ${a.ville}` : a.ville ? `Lieu : ${a.ville}` : '',
    a.latitude != null
      ? `https://www.openstreetmap.org/?mlat=${a.latitude}&mlon=${a.longitude}#map=17/${a.latitude}/${a.longitude}`
      : '',
    "StarPole, l'appli d'entraide de quartier. Bientôt disponible.",
  ]
    .filter(Boolean)
    .join('\n')
}

export const lienItineraire = (a) =>
  `https://www.google.com/maps/dir/?api=1&destination=${a.latitude},${a.longitude}&travelmode=driving`
