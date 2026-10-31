// Liste de mes conversations, et nouvelle conversation par numéro ou e-mail.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MessageSquarePlus, Search, X } from 'lucide-react'
import { useAuth } from '../../noyau/auth'
import { chercherPersonne, ouvrirConversation, useConversations } from '../../noyau/messagerie'
import { tempsEcoule } from '../../noyau/outils'
import { Avatar, Chargement, useVibre } from '../../composants/communs'

export default function Messages() {
  const { utilisateur, nom } = useAuth()
  const conversations = useConversations(utilisateur.uid)
  const naviguer = useNavigate()
  const [recherche, setRecherche] = useState('')
  const [nouvelle, setNouvelle] = useState(false)
  const [contact, setContact] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')
  const [classe, signaler] = useVibre()

  const mot = recherche.trim().toLowerCase()
  const liste = (conversations || []).filter((c) => !mot || c.autreNom.toLowerCase().includes(mot))

  async function demarrer(e) {
    e.preventDefault()
    setErreur('')
    if (!contact.trim()) {
      signaler('contact')
      return
    }
    setEnCours(true)
    try {
      const personne = await chercherPersonne(contact)
      if (!personne) {
        setErreur("Personne n'est inscrit sur StarPole avec ce numéro ou cet e-mail.")
        return
      }
      naviguer(`/messages/${await ouvrirConversation(personne, nom)}`)
    } catch {
      setErreur('Recherche impossible. Vérifiez votre connexion.')
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="page-etroite">
      <div className="titre-page">
        <h1>Messagerie</h1>
        <button className="bouton" onClick={() => setNouvelle(true)}>
          <MessageSquarePlus size={20} /> Nouvelle conversation
        </button>
      </div>
      <label className="recherche recherche-grise">
        <Search size={18} strokeWidth={1.8} />
        <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher une conversation" />
      </label>

      {conversations === null ? (
        <Chargement />
      ) : liste.length === 0 ? (
        <p className="vide">
          {conversations.length === 0
            ? "Aucune conversation pour l'instant. Écrivez à un voisin avec « Nouvelle conversation »."
            : 'Aucun résultat pour cette recherche.'}
        </p>
      ) : (
        <ul className="liste-conversations">
          {liste.map((c) => (
            <li key={c.id}>
              <Link to={`/messages/${c.id}`} className="ligne-conversation">
                <Avatar id={c.autreId} taille={50} />
                <div className="ligne-conversation-texte">
                  <strong>{c.autreNom}</strong>
                  <span className={c.nonLu ? 'non-lu' : 'secondaire'}>
                    {c.dernierParMoi ? 'Vous : ' : ''}
                    {c.dernierMessage}
                  </span>
                </div>
                <div className="ligne-conversation-droite">
                  <span className="indication">{tempsEcoule(c.dernierTemps)}</span>
                  {c.nonLu && <i className="pastille-nonlu statique" />}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {nouvelle && (
        <div className="fond-modale" onClick={() => setNouvelle(false)}>
          <form className="modale" onClick={(e) => e.stopPropagation()} onSubmit={demarrer} noValidate>
            <button type="button" className="fermer" onClick={() => setNouvelle(false)} aria-label="Fermer"><X size={18} /></button>
            <h2>Nouvelle conversation</h2>
            <p className="secondaire" style={{ marginTop: 8 }}>Entrez le numéro de téléphone ou l'e-mail d'un voisin inscrit sur StarPole.</p>
            <input
              className={`champ${classe('contact')}`}
              style={{ marginTop: 16 }}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="07 07 07 07 07 ou voisin@exemple.com"
              autoFocus
            />
            {erreur && <p className="message-erreur">{erreur}</p>}
            <button className="bouton large" style={{ marginTop: 18 }} disabled={enCours}>
              {enCours ? 'Recherche...' : 'Écrire'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
