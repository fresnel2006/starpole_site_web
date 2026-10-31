// Suivi d'une alerte : timeline (création, prise en charge, messages,
// résolution), message d'avancement, « Terminé » (auteur seul) et « Stopper ».
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { arreterDAider, ecrireProgression, terminer, useAlerte, useProgression } from '../../noyau/alertes'
import { useAuth } from '../../noyau/auth'
import { heureCourte } from '../../noyau/outils'
import { Chargement, useMessageFlottant, useVibre } from '../../composants/communs'

function Confirmation({ titre, texte, bouton, auOui, auNon }) {
  return (
    <div className="fond-modale" onClick={auNon}>
      <div className="modale" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2>{titre}</h2>
        <p className="secondaire" style={{ margin: '12px 0 22px' }}>{texte}</p>
        <div className="modale-boutons">
          <button className="bouton blanc" onClick={auNon}>Annuler</button>
          <button className="bouton" onClick={auOui}>{bouton}</button>
        </div>
      </div>
    </div>
  )
}

export default function SuiviAlerte() {
  const { id } = useParams()
  const alerte = useAlerte(id)
  const progression = useProgression(id)
  const { utilisateur } = useAuth()
  const naviguer = useNavigate()
  const [texte, setTexte] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [confirmer, setConfirmer] = useState(false)
  const [message, afficher] = useMessageFlottant()
  const [classe, signaler] = useVibre()

  if (alerte === undefined) return <Chargement />
  if (alerte === null) return <p className="vide">Cette alerte n'existe plus.</p>

  const moi = utilisateur.uid
  const estAuteur = alerte.auteurId === moi
  const estAidant = alerte.aidantId === moi
  const participant = alerte.statut === 'en_cours' && (estAuteur || estAidant)

  const etapes = [
    { date: alerte.creeLe, texte: `Alerte publiée par ${estAuteur ? 'vous' : alerte.auteurNom}` },
    ...(alerte.accepteLe ? [{ date: alerte.accepteLe, texte: `${estAidant ? 'Vous aidez' : `${alerte.aidantNom} aide`}` }] : []),
    ...progression.map((m) => ({ date: m.creeLe, texte: `${m.auteurId === moi ? 'Vous' : m.auteurNom} : ${m.texte}` })),
    ...(alerte.termineLe ? [{ date: alerte.termineLe, texte: 'Alerte résolue', fin: true }] : []),
  ].sort((a, b) => a.date - b.date)

  async function envoyer(e) {
    e.preventDefault()
    if (!texte.trim()) {
      signaler('texte')
      return
    }
    try {
      await ecrireProgression(alerte.id, texte)
      setTexte('')
    } catch {
      afficher("Impossible d'envoyer. Vérifiez votre connexion.")
    }
  }

  async function cloturer() {
    setConfirmer(false)
    setEnCours(true)
    try {
      if (estAuteur) await terminer(alerte.id)
      else await arreterDAider(alerte.id)
      naviguer(`/alertes/${alerte.id}`)
    } catch {
      afficher('Action impossible. Vérifiez votre connexion.')
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="page-etroite">
      <button className="retour" onClick={() => naviguer(-1)}><ArrowLeft size={20} /> Suivi</button>
      <h1>{alerte.categorie}</h1>
      <p className="secondaire" style={{ marginTop: 6 }}>{alerte.quartier ? `${alerte.quartier}, ${alerte.ville}` : alerte.ville}</p>

      <h2 style={{ margin: '28px 0 16px' }}>Timeline</h2>
      <ol className="timeline">
        {etapes.map((e, i) => (
          <li key={i} className={e.fin ? 'fin' : ''}>
            <span className="timeline-heure">{heureCourte(e.date)}</span>
            <span className="timeline-point" />
            <span>{e.texte}</span>
          </li>
        ))}
      </ol>

      {participant && (
        <div className="suivi-bas">
          <form className="zone-saisie" onSubmit={envoyer}>
            <input
              className={`champ${classe('texte')}`}
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              maxLength={300}
              placeholder="Décrivez la situation..."
            />
            <button className="bouton-rond" aria-label="Envoyer"><Send size={20} /></button>
          </form>
          <div className="suivi-boutons">
            {/* Seul l'auteur peut terminer son alerte. */}
            {estAuteur && (
              <button className="bouton" disabled={enCours} onClick={cloturer}>Terminé</button>
            )}
            <button className="bouton blanc" disabled={enCours} onClick={() => setConfirmer(true)}>Stopper</button>
          </div>
        </div>
      )}

      {confirmer && (
        <Confirmation
          titre={estAuteur ? "Stopper l'alerte ?" : "Arrêter d'aider ?"}
          texte={
            estAuteur
              ? 'Votre alerte sera fermée pour tout le monde.'
              : "Seule votre aide s'arrête. L'alerte reste ouverte : un autre voisin pourra la prendre en charge."
          }
          bouton={estAuteur ? 'Stopper' : "Arrêter d'aider"}
          auOui={cloturer}
          auNon={() => setConfirmer(false)}
        />
      )}
      {message}
    </div>
  )
}
