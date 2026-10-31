// Préparation d'une photo avant de l'enregistrer dans Firestore (pas de
// Storage, payant) : redressée par le navigateur, réduite, en JPEG léger.
// Mêmes formes que l'appli : « entiere » pour une alerte (plus grand côté
// 900 px, jamais coupée), « carre » pour un profil (400 px), « paysage » pour
// un message (2 pour 1, 640 px).

const TAILLE_MAX_OCTETS = 200_000

function chargerImage(fichier) {
  return new Promise((resoudre, rejeter) => {
    const url = URL.createObjectURL(fichier)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resoudre(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      rejeter(new Error("Impossible d'ouvrir la photo."))
    }
    image.src = url
  })
}

/** Renvoie la photo en base64 (sans l'en-tête data:), prête pour Firestore. */
export async function preparerPhoto(fichier, forme = 'entiere') {
  const image = await chargerImage(fichier)
  const l = image.naturalWidth
  const h = image.naturalHeight
  let sx = 0
  let sy = 0
  let sl = l
  let sh = h
  let largeur
  let hauteur
  if (forme === 'entiere') {
    const echelle = Math.min(1, 900 / Math.max(l, h))
    largeur = Math.round(l * echelle)
    hauteur = Math.round(h * echelle)
  } else {
    // Coupe au centre au bon rapport, puis réduction.
    const ratio = forme === 'carre' ? 1 : 2
    const max = forme === 'carre' ? 400 : 640
    if (l / h > ratio) {
      sl = Math.round(h * ratio)
      sx = Math.round((l - sl) / 2)
    } else {
      sh = Math.round(l / ratio)
      sy = Math.round((h - sh) / 2)
    }
    largeur = Math.min(max, sl)
    hauteur = Math.round(largeur / ratio)
  }
  const toile = document.createElement('canvas')
  toile.width = largeur
  toile.height = hauteur
  toile.getContext('2d').drawImage(image, sx, sy, sl, sh, 0, 0, largeur, hauteur)
  // La qualité baisse si besoin pour rester sous la limite de la base.
  for (let qualite = 0.8; qualite >= 0.4; qualite -= 0.1) {
    const texte = toile.toDataURL('image/jpeg', qualite).split(',')[1]
    if ((texte.length * 3) / 4 <= TAILLE_MAX_OCTETS || qualite < 0.45) return texte
  }
  return toile.toDataURL('image/jpeg', 0.4).split(',')[1]
}
