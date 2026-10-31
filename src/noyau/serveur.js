// Demandes au serveur StarPole (FastAPI sur Vercel) : codes de connexion,
// notifications et vérification des alertes par l'IA.
const ADRESSE = import.meta.env.VITE_SERVEUR || 'https://starpole-backend.vercel.app'

export class ErreurServeur extends Error {}

/** Envoie `corps` en JSON à `chemin`. `jeton` : jeton Firebase si la route
 * demande d'être connecté. Les erreurs du serveur sont déjà en français. */
export async function envoyerAuServeur(chemin, corps, jeton) {
  let reponse
  try {
    reponse = await fetch(`${ADRESSE}${chemin}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
      },
      body: JSON.stringify(corps),
    })
  } catch {
    throw new ErreurServeur('Pas de connexion internet.')
  }
  let donnees = {}
  try {
    donnees = await reponse.json()
  } catch {
    // Réponse inattendue : on garde un objet vide.
  }
  if (!reponse.ok) {
    throw new ErreurServeur(donnees.erreur || 'Le serveur a rencontré un problème. Réessayez.')
  }
  return donnees
}
