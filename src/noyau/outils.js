// Petits outils partagés : normalisation, quartiers d'Abidjan, dates.

export const normaliserEmail = (saisie) => saisie.trim().toLowerCase()

export function normaliserTelephone(saisie) {
  const chiffres = saisie.replace(/\D/g, '')
  return chiffres.length >= 10 ? chiffres.slice(-10) : chiffres
}

export const emailValide = (email) =>
  email.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)

// Les quartiers d'Abidjan avec un point central approximatif (mêmes valeurs
// que l'appli mobile).
export const QUARTIERS = [
  ['Plateau', 5.3197, -4.0167],
  ['Treichville', 5.295, -4.009],
  ['Marcory', 5.303, -3.985],
  ['Koumassi', 5.295, -3.95],
  ['Cocody', 5.355, -3.985],
  ['Yopougon', 5.34, -4.09],
  ['Adjamé', 5.36, -4.023],
  ['Abobo', 5.42, -4.02],
]

export const CENTRE_ABIDJAN = [-4.0083, 5.3364]

export function distanceKm(lat1, lon1, lat2, lon2) {
  const rad = (d) => (d * Math.PI) / 180
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(a))
}

/** Le lieu d'une position : quartier d'Abidjan le plus proche, ou null hors
 * d'Abidjan (rayon de 30 km autour du Plateau). */
export function lieuDepuis(latitude, longitude) {
  const [, latP, lonP] = QUARTIERS[0]
  if (distanceKm(latitude, longitude, latP, lonP) > 30) return null
  let meilleur = QUARTIERS[0]
  let min = Infinity
  for (const q of QUARTIERS) {
    const d = distanceKm(latitude, longitude, q[1], q[2])
    if (d < min) {
      min = d
      meilleur = q
    }
  }
  return { ville: 'Abidjan', quartier: meilleur[0] }
}

export function libelleDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(km < 10 ? 1 : 0).replace('.', ',')} km`
}

/** « il y a 5 min », « il y a 2 h », « hier »... */
export function tempsEcoule(date) {
  if (!date) return ''
  const secondes = Math.max(0, (Date.now() - date.getTime()) / 1000)
  if (secondes < 60) return "à l'instant"
  const minutes = Math.floor(secondes / 60)
  if (minutes < 60) return `il y a ${minutes} min`
  const heures = Math.floor(minutes / 60)
  if (heures < 24) return `il y a ${heures} h`
  const jours = Math.floor(heures / 24)
  if (jours === 1) return 'hier'
  return `il y a ${jours} jours`
}

export const heureCourte = (date) =>
  date ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''

/** Convertit un horodatage Firestore (ou rien) en Date. */
export const enDate = (valeur) => (valeur?.toDate ? valeur.toDate() : valeur instanceof Date ? valeur : null)

/** Image base64 enregistrée dans Firestore vers une adresse utilisable par <img>. */
export const imageBase64 = (texte) => (texte ? `data:image/jpeg;base64,${texte}` : null)
