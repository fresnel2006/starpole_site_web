// Compte et profil de la personne connectée, partagés par tout le site.
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  GoogleAuthProvider,
  getAdditionalUserInfo,
  getRedirectResult,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, base } from './firebase'
import { envoyerAuServeur } from './serveur'
import { normaliserEmail, normaliserTelephone } from './outils'

const ContexteAuth = createContext(null)

export function FournisseurAuth({ children }) {
  const [utilisateur, setUtilisateur] = useState(undefined) // undefined : on ne sait pas encore
  const [profil, setProfil] = useState(null)

  useEffect(() => onAuthStateChanged(auth, setUtilisateur), [])

  // Retour de Google après une connexion par redirection (fenêtre bloquée).
  useEffect(() => {
    getRedirectResult(auth)
      .then((resultat) => resultat && creerProfilSiNouveau(resultat))
      .catch((e) => console.error('Connexion Google :', e.code))
  }, [])

  // Le profil Firestore, en direct.
  useEffect(() => {
    if (!utilisateur) {
      setProfil(null)
      return undefined
    }
    rendreRecherchable(utilisateur)
    return onSnapshot(
      doc(base, 'utilisateurs', utilisateur.uid),
      (instantane) => setProfil(instantane.data() ?? {}),
      () => setProfil({}),
    )
  }, [utilisateur])

  // Présence : tant que la page est ouverte et visible, on le signale (deux
  // coches chez la personne qui écrit, comme dans l'appli).
  useEffect(() => {
    if (!utilisateur) return undefined
    const signaler = () => {
      if (document.visibilityState !== 'visible') return
      setDoc(doc(base, 'utilisateurs', utilisateur.uid), { vuLe: serverTimestamp() }, { merge: true }).catch(
        () => {},
      )
    }
    signaler()
    const minuteur = setInterval(signaler, 45000)
    document.addEventListener('visibilitychange', signaler)
    return () => {
      clearInterval(minuteur)
      document.removeEventListener('visibilitychange', signaler)
    }
  }, [utilisateur])

  const valeur = useMemo(
    () => ({
      utilisateur,
      profil,
      nom: profil?.nom || utilisateur?.displayName || 'Utilisateur',
      chargement: utilisateur === undefined,
    }),
    [utilisateur, profil],
  )
  return <ContexteAuth.Provider value={valeur}>{children}</ContexteAuth.Provider>
}

export const useAuth = () => useContext(ContexteAuth)

/** Complète le profil (e-mail et téléphone normalisés) pour que les contacts
 * puissent retrouver la personne, comme dans l'appli. */
async function rendreRecherchable(utilisateur) {
  try {
    const ref = doc(base, 'utilisateurs', utilisateur.uid)
    const donnees = (await getDoc(ref)).data() ?? {}
    const email = donnees.email ?? utilisateur.email ?? ''
    const telephone = donnees.telephone ?? ''
    if (
      donnees.emailNormalise === normaliserEmail(email) &&
      donnees.telephoneNormalise === normaliserTelephone(telephone)
    ) {
      return
    }
    await setDoc(
      ref,
      {
        nom: donnees.nom ?? utilisateur.displayName ?? '',
        email,
        telephone,
        emailNormalise: normaliserEmail(email),
        telephoneNormalise: normaliserTelephone(telephone),
      },
      { merge: true },
    )
  } catch {
    // Sera refait à la prochaine visite.
  }
}

/** Demande le code à 4 chiffres, envoyé par e-mail par le serveur. */
export const demanderCode = (email) =>
  envoyerAuServeur('/auth/demander-code', { email: normaliserEmail(email) })

/** Vérifie le code ; le serveur renvoie un jeton qui ouvre la session. */
export async function verifierCode(email, code, nom) {
  const donnees = await envoyerAuServeur('/auth/verifier-code', {
    email: normaliserEmail(email),
    code,
    ...(nom?.trim() ? { nom: nom.trim() } : {}),
  })
  if (!donnees.jetonPersonnalise) throw new Error('Connexion impossible. Réessayez.')
  await signInWithCustomToken(auth, donnees.jetonPersonnalise)
}

// Messages clairs pour les erreurs de connexion Google.
const ERREURS_GOOGLE = {
  'auth/unauthorized-domain':
    "Cette adresse n'est pas encore autorisée pour la connexion Google (Firebase, Domaines autorisés).",
  'auth/operation-not-allowed': "La connexion Google n'est pas activée dans Firebase.",
  'auth/network-request-failed': 'Pas de connexion internet. Réessayez.',
  'auth/too-many-requests': 'Trop de tentatives. Patientez un peu, puis réessayez.',
  'auth/user-disabled': 'Ce compte a été suspendu.',
  'auth/account-exists-with-different-credential':
    'Un compte existe déjà avec cet e-mail. Connectez-vous avec votre e-mail et le code.',
  'auth/internal-error': 'Google a refusé la connexion depuis ce navigateur. Réessayez.',
}

async function creerProfilSiNouveau(resultat) {
  if (!getAdditionalUserInfo(resultat)?.isNewUser) return
  const u = resultat.user
  await setDoc(doc(base, 'utilisateurs', u.uid), {
    nom: u.displayName ?? '',
    telephone: '',
    email: u.email ?? '',
    telephoneNormalise: '',
    emailNormalise: normaliserEmail(u.email ?? ''),
    creeLe: serverTimestamp(),
  }).catch(() => {})
}

/** Connexion Google (jamais de code : Google a déjà vérifié l'e-mail). Si le
 * navigateur bloque la fenêtre Google, la page part chez Google et revient. */
export async function connecterAvecGoogle() {
  const fournisseur = new GoogleAuthProvider()
  fournisseur.setCustomParameters({ prompt: 'select_account' })
  try {
    await creerProfilSiNouveau(await signInWithPopup(auth, fournisseur))
    return true
  } catch (e) {
    if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return false
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, fournisseur)
      return false
    }
    console.error('Connexion Google :', e.code, e.message)
    throw new Error(ERREURS_GOOGLE[e.code] || `Connexion Google impossible (${e.code || 'erreur inconnue'}). Réessayez.`)
  }
}

export const seDeconnecter = () => signOut(auth)

export async function modifierProfil({ nom, telephone, photo }) {
  const u = auth.currentUser
  if (!u) throw new Error('Connectez-vous pour modifier votre profil.')
  const donnees = {}
  if (nom !== undefined) donnees.nom = nom.trim()
  if (telephone !== undefined) {
    donnees.telephone = telephone.trim()
    donnees.telephoneNormalise = normaliserTelephone(telephone)
  }
  if (photo !== undefined) donnees.photo = photo
  await setDoc(doc(base, 'utilisateurs', u.uid), donnees, { merge: true })
  if (nom !== undefined) await updateProfile(u, { displayName: nom.trim() })
}
