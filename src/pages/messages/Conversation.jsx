// Une conversation : messages en direct, réponse à un message précis,
// modification de ses messages, coches (envoyé, reçu, vu).
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, CheckCheck, Pencil, Reply, Send, X } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { base } from '../../noyau/firebase'
import { useAuth } from '../../noyau/auth'
import { coches, envoyerMessage, marquerLu, modifierMessage, useConversation } from '../../noyau/messagerie'
import { heureCourte, imageBase64 } from '../../noyau/outils'
import { Avatar, Chargement, useMessageFlottant, useVibre } from '../../composants/communs'

function Coches({ nombre }) {
  if (nombre === 1) return <Check size={14} aria-label="Envoyé" />
  return (
    <span className={`coches${nombre === 3 ? ' vu' : ''}`} aria-label={nombre === 3 ? 'Vu' : 'Reçu'}>
      <CheckCheck size={14} />
      {nombre === 3 && <Check size={14} className="troisieme" />}
    </span>
  )
}

export default function Conversation() {
  const { id } = useParams()
  const { utilisateur } = useAuth()
  const moi = utilisateur.uid
  const autreId = id.split('_').find((p) => p !== moi) || ''
  const [autreNom, setAutreNom] = useState('')
  const { messages, luParAutre, vuLe } = useConversation(id, autreId)
  const naviguer = useNavigate()
  const [texte, setTexte] = useState('')
  const [reponseA, setReponseA] = useState(null)
  const [enModification, setEnModification] = useState(null)
  const [message, afficher] = useMessageFlottant()
  const [classe, signaler] = useVibre()
  const bas = useRef(null)
  const champ = useRef(null)

  useEffect(() => {
    getDoc(doc(base, 'conversations', id))
      .then((s) => setAutreNom(s.data()?.noms?.[autreId] || 'Utilisateur'))
      .catch(() => setAutreNom('Utilisateur'))
  }, [id, autreId])

  // Quand l'autre écrit, la conversation est marquée comme lue.
  const dernier = messages?.[messages.length - 1]
  useEffect(() => {
    marquerLu(id)
  }, [id, dernier?.id])

  useEffect(() => {
    bas.current?.scrollIntoView({ block: 'end' })
  }, [messages?.length])

  async function envoyer(e) {
    e.preventDefault()
    if (!texte.trim()) {
      signaler('texte')
      return
    }
    try {
      if (enModification) {
        if (texte.trim() !== enModification.texte) {
          await modifierMessage(id, enModification.id, texte, enModification.id === dernier?.id)
        }
      } else {
        await envoyerMessage(id, texte, reponseA && { texte: reponseA.photo ? 'Photo' : reponseA.texte, auteurId: reponseA.auteurId })
      }
      setTexte('')
      setReponseA(null)
      setEnModification(null)
    } catch {
      afficher("Impossible d'envoyer le message. Vérifiez votre connexion.")
    }
  }

  const nomDe = (auteurId) => (auteurId === moi ? 'Vous' : autreNom)

  return (
    <div className="conversation">
      <div className="conversation-entete">
        <button className="retour" style={{ margin: 0 }} onClick={() => naviguer('/messages')} aria-label="Retour"><ArrowLeft size={22} /></button>
        <Avatar id={autreId} taille={44} />
        <strong>{autreNom}</strong>
      </div>

      <div className="conversation-fil">
        {messages === null ? (
          <Chargement />
        ) : messages.length === 0 ? (
          <p className="vide">Dites bonjour à {autreNom}.</p>
        ) : (
          messages.map((m) => {
            const envoye = m.auteurId === moi
            const modifiable = envoye && !m.photo && m.latitude == null
            return (
              <div key={m.id} className={`bulle-ligne${envoye ? ' envoye' : ''}`}>
                <div className="bulle">
                  {m.reponseTexte && (
                    <div className="citation">
                      <strong>{nomDe(m.reponseAuteurId)}</strong>
                      <span>{m.reponseTexte}</span>
                    </div>
                  )}
                  {m.photo && <img className="bulle-photo" src={imageBase64(m.photo)} alt="" />}
                  {m.latitude != null && (
                    <a className="bulle-lien" href={`https://www.google.com/maps?q=${m.latitude},${m.longitude}`} target="_blank" rel="noreferrer">
                      Voir la position sur la carte
                    </a>
                  )}
                  {!m.photo && <p>{m.texte}</p>}
                  <span className="bulle-heure">
                    {m.modifie ? 'Modifié  ' : ''}
                    {heureCourte(m.creeLe)}
                    {envoye && <Coches nombre={coches(m, luParAutre, vuLe)} />}
                  </span>
                </div>
                <div className="bulle-actions">
                  <button onClick={() => { setEnModification(null); setReponseA(m); champ.current?.focus() }} aria-label="Répondre" title="Répondre"><Reply size={16} /></button>
                  {modifiable && (
                    <button onClick={() => { setReponseA(null); setEnModification(m); setTexte(m.texte); champ.current?.focus() }} aria-label="Modifier" title="Modifier"><Pencil size={15} /></button>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={bas} />
      </div>

      {(reponseA || enModification) && (
        <div className="bandeau-reponse">
          <div>
            <strong>{enModification ? 'Modification du message' : `Réponse à ${nomDe(reponseA.auteurId)}`}</strong>
            <span>{(enModification || reponseA).photo ? 'Photo' : (enModification || reponseA).texte}</span>
          </div>
          <button onClick={() => { if (enModification) setTexte(''); setReponseA(null); setEnModification(null) }} aria-label="Annuler"><X size={18} /></button>
        </div>
      )}
      <form className="zone-saisie conversation-saisie" onSubmit={envoyer}>
        <input ref={champ} className={`champ${classe('texte')}`} value={texte} onChange={(e) => setTexte(e.target.value)} maxLength={1000} placeholder="Écrivez un message..." />
        <button className="bouton-rond" aria-label="Envoyer le message"><Send size={20} /></button>
      </form>
      {message}
    </div>
  )
}
