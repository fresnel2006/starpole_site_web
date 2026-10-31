// Messagerie : mêmes conversations que l'appli (conversations/{uidA_uidB},
// identifiants triés, sous-collection `messages`).
import { useEffect, useState } from 'react'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { auth, base } from './firebase'
import { envoyerAuServeur } from './serveur'
import { enDate, normaliserEmail, normaliserTelephone } from './outils'

/** Mes conversations qui contiennent des messages, la plus récente d'abord. */
export function useConversations(uid) {
  const [liste, setListe] = useState(null)
  useEffect(() => {
    if (!uid) return undefined
    return onSnapshot(
      query(collection(base, 'conversations'), where('participants', 'array-contains', uid)),
      (s) => {
        const conversations = s.docs
          .map((d) => {
            const c = d.data()
            const autreId = (c.participants || []).find((p) => p !== uid) || ''
            const dernierTemps = enDate(c.dernierTemps) ?? new Date()
            const luLe = enDate(c.lu?.[uid])
            return {
              id: d.id,
              autreId,
              autreNom: c.noms?.[autreId] || 'Utilisateur',
              dernierMessage: c.dernierMessage || '',
              dernierParMoi: c.dernierAuteurId === uid,
              dernierTemps,
              nonLu: !!c.dernierAuteurId && c.dernierAuteurId !== uid && (!luLe || luLe < dernierTemps),
            }
          })
          .filter((c) => c.dernierMessage)
          .sort((a, b) => b.dernierTemps - a.dernierTemps)
        setListe(conversations)
      },
      () => setListe([]),
    )
  }, [uid])
  return liste
}

/** Les messages d'une conversation et ce que l'autre a fait (lecture, présence). */
export function useConversation(conversationId, autreId) {
  const [messages, setMessages] = useState(null)
  const [luParAutre, setLuParAutre] = useState(null)
  const [vuLe, setVuLe] = useState(null)
  useEffect(() => {
    const desabonner = [
      onSnapshot(
        query(collection(base, 'conversations', conversationId, 'messages'), orderBy('creeLe')),
        (s) => setMessages(s.docs.map((d) => ({ id: d.id, ...d.data(), creeLe: enDate(d.data().creeLe) ?? new Date() }))),
        () => setMessages([]),
      ),
      onSnapshot(doc(base, 'conversations', conversationId), (s) =>
        setLuParAutre(enDate(s.data()?.lu?.[autreId])),
      ),
      onSnapshot(doc(base, 'utilisateurs', autreId), (s) => setVuLe(enDate(s.data()?.vuLe))),
    ]
    return () => desabonner.forEach((f) => f())
  }, [conversationId, autreId])
  return { messages, luParAutre, vuLe }
}

/** Le nombre de coches d'un message envoyé : 1 envoyé, 2 reçu, 3 vu. */
export function coches(message, luParAutre, vuLe) {
  if (luParAutre && luParAutre >= message.creeLe) return 3
  if (vuLe && (vuLe >= message.creeLe || Date.now() - vuLe.getTime() < 90000)) return 2
  return 1
}

/** Cherche une personne inscrite par son numéro ou son e-mail. */
export async function chercherPersonne(saisie) {
  const texte = saisie.trim()
  const parEmail = texte.includes('@')
  const valeur = parEmail ? normaliserEmail(texte) : normaliserTelephone(texte)
  if (!valeur) return null
  const s = await getDocs(
    query(collection(base, 'utilisateurs'), where(parEmail ? 'emailNormalise' : 'telephoneNormalise', '==', valeur), limit(1)),
  )
  const trouve = s.docs.find((d) => d.id !== auth.currentUser?.uid)
  return trouve ? { id: trouve.id, nom: trouve.data().nom || 'Utilisateur' } : null
}

/** Ouvre (ou crée) la conversation avec une personne et renvoie son identifiant. */
export async function ouvrirConversation(autre, monNom) {
  const moi = auth.currentUser.uid
  const participants = [moi, autre.id].sort()
  const id = participants.join('_')
  const ref = doc(base, 'conversations', id)
  const existante = await getDoc(ref)
  if (!existante.exists()) {
    await setDoc(ref, {
      participants,
      noms: { [moi]: monNom, [autre.id]: autre.nom },
      creeLe: serverTimestamp(),
      dernierMessage: '',
      dernierAuteurId: '',
      dernierTemps: serverTimestamp(),
      lu: {},
    })
  }
  return id
}

const apercu = (texte, max) => (texte.length > max ? `${texte.slice(0, max)}...` : texte)

export async function envoyerMessage(conversationId, texte, reponse) {
  const moi = auth.currentUser.uid
  const nettoye = texte.trim()
  if (!nettoye) return
  const ref = doc(base, 'conversations', conversationId)
  const lot = writeBatch(base)
  lot.set(doc(collection(ref, 'messages')), {
    texte: nettoye,
    auteurId: moi,
    creeLe: serverTimestamp(),
    ...(reponse ? { reponseTexte: apercu(reponse.texte, 150), reponseAuteurId: reponse.auteurId } : {}),
  })
  lot.update(ref, {
    dernierMessage: apercu(nettoye, 120),
    dernierAuteurId: moi,
    dernierTemps: serverTimestamp(),
    [`lu.${moi}`]: serverTimestamp(),
  })
  await lot.commit()
  // Le serveur envoie la notification à l'autre personne.
  auth.currentUser
    .getIdToken()
    .then((jeton) => envoyerAuServeur('/notifications/message', { conversationId }, jeton))
    .catch(() => {})
}

export async function modifierMessage(conversationId, messageId, texte, dernier) {
  const nettoye = texte.trim()
  if (!nettoye) return
  const ref = doc(base, 'conversations', conversationId)
  const lot = writeBatch(base)
  lot.update(doc(ref, 'messages', messageId), { texte: nettoye, modifie: true })
  if (dernier) lot.update(ref, { dernierMessage: apercu(nettoye, 120) })
  await lot.commit()
}

export function marquerLu(conversationId) {
  const moi = auth.currentUser?.uid
  if (!moi) return
  updateDoc(doc(base, 'conversations', conversationId), { [`lu.${moi}`]: serverTimestamp() }).catch(() => {})
}
