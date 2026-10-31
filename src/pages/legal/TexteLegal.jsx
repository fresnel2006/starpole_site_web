// Conditions d'utilisation et politique de confidentialité (mêmes textes que
// l'appli).
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import textes from './textes.json'

export default function TexteLegal() {
  const { texte } = useParams()
  const naviguer = useNavigate()
  const contenu = textes[texte]
  if (!contenu) return <div className="vide">Ce texte n'existe pas.</div>
  return (
    <div className="page-etroite texte-legal">
      <button className="retour" onClick={() => naviguer(-1)}>
        <ArrowLeft size={20} /> Retour
      </button>
      <h1>{contenu.titre}</h1>
      <p className="secondaire" style={{ margin: '12px 0 8px' }}>{contenu.introduction}</p>
      {contenu.sections.map((s) => (
        <section key={s.titre}>
          <h3>{s.titre}</h3>
          {s.paragraphes.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
        </section>
      ))}
    </div>
  )
}
