// Mon profil : photo, nom, numéro, mes alertes et aides, déconnexion.
import { useRef, useState } from 'react'
import { Camera, LogOut, Phone, Mail } from 'lucide-react'
import { modifierProfil, seDeconnecter, useAuth } from '../../noyau/auth'
import { useMesAlertes } from '../../noyau/alertes'
import { preparerPhoto } from '../../noyau/photo'
import { Avatar, Chargement, useMessageFlottant, useVibre } from '../../composants/communs'
import CarteAlerte from '../../composants/CarteAlerte'

export default function Profil() {
  const { utilisateur, profil, nom } = useAuth()
  const { liste } = useMesAlertes(utilisateur.uid)
  const [edition, setEdition] = useState(false)
  const [nouveauNom, setNouveauNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [message, afficher] = useMessageFlottant()
  const [classe, signaler] = useVibre()
  const choixPhoto = useRef(null)

  function ouvrirEdition() {
    setNouveauNom(nom)
    setTelephone(profil?.telephone ?? '')
    setEdition(true)
  }

  async function enregistrer(e) {
    e.preventDefault()
    if (!nouveauNom.trim()) {
      signaler('nom')
      return
    }
    setEnCours(true)
    try {
      await modifierProfil({ nom: nouveauNom, telephone })
      setEdition(false)
      afficher('Profil enregistré.')
    } catch {
      afficher("Impossible d'enregistrer. Vérifiez votre connexion.")
    } finally {
      setEnCours(false)
    }
  }

  async function changerPhoto(e) {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    try {
      await modifierProfil({ photo: await preparerPhoto(fichier, 'carre') })
      afficher('Photo enregistrée.')
    } catch {
      afficher("Impossible d'enregistrer la photo.")
    }
  }

  const publiees = (liste || []).filter((a) => a.auteurId === utilisateur.uid).length
  const aidees = (liste || []).filter((a) => a.aidantId === utilisateur.uid).length

  return (
    <div className="page">
      <div className="profil-entete carte">
        <button className="profil-photo" onClick={() => choixPhoto.current?.click()} aria-label="Changer la photo">
          <Avatar id={utilisateur.uid} photo={profil?.photo ?? null} taille={96} />
          <span className="profil-photo-icone"><Camera size={16} /></span>
        </button>
        <input ref={choixPhoto} type="file" accept="image/*" hidden onChange={changerPhoto} />
        <div className="profil-infos">
          <h1>{nom}</h1>
          <p className="secondaire"><Mail size={15} style={{ verticalAlign: -2 }} /> {profil?.email || utilisateur.email}</p>
          <p className="secondaire"><Phone size={15} style={{ verticalAlign: -2 }} /> {profil?.telephone || 'Aucun numéro'}</p>
          <div className="profil-chiffres">
            <span><strong>{publiees}</strong> alertes publiées</span>
            <span><strong>{aidees}</strong> aides apportées</span>
          </div>
        </div>
        <div className="profil-boutons">
          <button className="bouton blanc" onClick={ouvrirEdition}>Modifier</button>
          <button className="bouton blanc" onClick={seDeconnecter}><LogOut size={18} /> Se déconnecter</button>
        </div>
      </div>

      {!profil?.telephone && (
        <div className="bandeau-info" style={{ marginTop: 18 }}>
          <Phone size={20} /> Entrez votre numéro de téléphone pour être visible par vos contacts.
          <button className="lien-bouton" style={{ marginLeft: 'auto' }} onClick={ouvrirEdition}>Ajouter mon numéro</button>
        </div>
      )}

      <h2 style={{ margin: '30px 0 16px' }}>Mes alertes, aides & dons</h2>
      {liste === null ? (
        <Chargement />
      ) : liste.length === 0 ? (
        <p className="vide">Vous n'avez encore publié ni aidé aucune alerte.</p>
      ) : (
        <div className="grille-alertes">
          {liste.map((a) => <CarteAlerte key={a.id} alerte={a} />)}
        </div>
      )}

      {edition && (
        <div className="fond-modale" onClick={() => setEdition(false)}>
          <form className="modale" onClick={(e) => e.stopPropagation()} onSubmit={enregistrer} noValidate>
            <h2>Modifier mon profil</h2>
            <label className="etiquette" htmlFor="nom">Nom</label>
            <input id="nom" className={`champ${classe('nom')}`} value={nouveauNom} onChange={(e) => setNouveauNom(e.target.value)} maxLength={100} />
            <label className="etiquette" htmlFor="tel">Numéro de téléphone</label>
            <input id="tel" className="champ" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="07 07 07 07 07" inputMode="tel" />
            <p className="indication" style={{ marginTop: 8 }}>L'e-mail est lié à votre compte et ne peut pas être changé.</p>
            <div className="modale-boutons" style={{ marginTop: 22 }}>
              <button type="button" className="bouton blanc" onClick={() => setEdition(false)}>Annuler</button>
              <button className="bouton" disabled={enCours}>{enCours ? 'Enregistrement...' : 'Enregistrer'}</button>
            </div>
          </form>
        </div>
      )}
      {message}
    </div>
  )
}
