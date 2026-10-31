// Connexion et inscription : un seul champ e-mail, un code à 4 chiffres reçu
// par e-mail (comme l'appli), ou Google (jamais de code).
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { connecterAvecGoogle, demanderCode, useAuth, verifierCode } from '../../noyau/auth'
import { emailValide, normaliserEmail } from '../../noyau/outils'
import { Chargement, Marque, useVibre } from '../../composants/communs'

const LogoGoogle = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
)

export default function Connexion() {
  const { utilisateur, chargement } = useAuth()
  const lieu = useLocation()
  const [mode, setMode] = useState('connexion') // connexion ou inscription
  const [etape, setEtape] = useState('email') // email ou code
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [conditions, setConditions] = useState(false)
  const [code, setCode] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')
  const [attente, setAttente] = useState(0)
  const [classe, signaler] = useVibre()
  const champCode = useRef(null)

  // Renvoi du code possible après 1 minute.
  useEffect(() => {
    if (attente <= 0) return undefined
    const t = setTimeout(() => setAttente((a) => a - 1), 1000)
    return () => clearTimeout(t)
  }, [attente])

  if (chargement) return <Chargement />
  if (utilisateur) return <Navigate to={lieu.state?.depuis || '/'} replace />

  const inscription = mode === 'inscription'

  async function envoyerCode(e) {
    e?.preventDefault()
    setErreur('')
    let ok = true
    if (inscription && !nom.trim()) {
      signaler('nom')
      ok = false
    }
    if (!emailValide(normaliserEmail(email))) {
      signaler('email')
      ok = false
    }
    if (inscription && !conditions) {
      signaler('conditions')
      ok = false
    }
    if (!ok) return
    setEnCours(true)
    try {
      await demanderCode(email)
      setEtape('code')
      setCode('')
      setAttente(60)
      setTimeout(() => champCode.current?.focus(), 50)
    } catch (err) {
      setErreur(err.message)
    } finally {
      setEnCours(false)
    }
  }

  async function verifier(valeur) {
    setEnCours(true)
    setErreur('')
    try {
      await verifierCode(email, valeur, inscription ? nom : undefined)
    } catch (err) {
      setErreur(err.message)
      setCode('')
      signaler('code')
      champCode.current?.focus()
    } finally {
      setEnCours(false)
    }
  }

  function saisirCode(valeur) {
    const chiffres = valeur.replace(/\D/g, '').slice(0, 4)
    setCode(chiffres)
    // Vérification automatique au 4e chiffre.
    if (chiffres.length === 4) verifier(chiffres)
  }

  async function google() {
    setErreur('')
    if (inscription && !conditions) {
      signaler('conditions')
      return
    }
    try {
      await connecterAvecGoogle()
    } catch (err) {
      setErreur(err.message)
    }
  }

  return (
    <div className="connexion">
      <section className="connexion-visuel">
        <img src="/images/abidjan.jpg" alt="" />
        <div className="connexion-voile" />
        <div className="connexion-accroche">
          <img src="/images/etoile.png" alt="" className="connexion-etoile" />
          <h1>
            L'aide de votre quartier,
            <br />à portée de main.
          </h1>
          <p>Alerter, demander, donner : une étoile pour ne jamais rester seul.</p>
        </div>
      </section>

      <section className="connexion-formulaire">
        <div className="connexion-boite">
          <img src="/images/logo.png" alt="Logo StarPole" className="connexion-logo" />
          <Marque taille={34} />

          {etape === 'email' ? (
            <form onSubmit={envoyerCode} noValidate>
              <div className="onglets">
                <button type="button" className={!inscription ? 'actif' : ''} onClick={() => setMode('connexion')}>
                  Se connecter
                </button>
                <button type="button" className={inscription ? 'actif' : ''} onClick={() => setMode('inscription')}>
                  S'inscrire
                </button>
              </div>

              {inscription && (
                <>
                  <label className="etiquette" htmlFor="nom">Nom complet</label>
                  <input id="nom" className={`champ${classe('nom')}`} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Awa Koné" maxLength={100} />
                </>
              )}
              <label className="etiquette" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className={`champ${classe('email')}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                autoComplete="email"
              />

              {inscription && (
                <label className={`case-conditions${classe('conditions')}`}>
                  <input type="checkbox" checked={conditions} onChange={(e) => setConditions(e.target.checked)} />
                  <span>
                    J'accepte les <Link to="/legal/conditions" target="_blank">conditions d'utilisation</Link> et la{' '}
                    <Link to="/legal/confidentialite" target="_blank">politique de confidentialité</Link>.
                  </span>
                </label>
              )}

              <button className="bouton large" disabled={enCours} style={{ marginTop: 22 }}>
                {enCours ? 'Envoi...' : 'Recevoir mon code'}
              </button>
              <div className="separateur"><span>ou</span></div>
              <button type="button" className="bouton blanc large" onClick={google}>
                <LogoGoogle /> Continuer avec Google
              </button>
            </form>
          ) : (
            <div>
              <button className="retour" onClick={() => setEtape('email')}>
                <ArrowLeft size={20} /> Retour
              </button>
              <h2>Entrez votre code</h2>
              <p className="secondaire" style={{ marginTop: 8 }}>
                Un code à 4 chiffres a été envoyé à <strong>{normaliserEmail(email)}</strong>.
              </p>
              <div className={`cases-code${classe('code')}`} onClick={() => champCode.current?.focus()}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`case-code${code.length === i ? ' active' : ''}`}>{code[i] || ''}</div>
                ))}
                <input
                  ref={champCode}
                  className="code-cache"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => saisirCode(e.target.value)}
                  disabled={enCours}
                  aria-label="Code à 4 chiffres"
                />
              </div>
              {enCours && <p className="indication">Vérification...</p>}
              <button className="lien-bouton" disabled={attente > 0 || enCours} onClick={() => envoyerCode()}>
                {attente > 0 ? `Renvoyer le code dans ${attente} s` : 'Renvoyer le code'}
              </button>
            </div>
          )}
          {erreur && <p className="message-erreur">{erreur}</p>}
        </div>
      </section>
    </div>
  )
}
