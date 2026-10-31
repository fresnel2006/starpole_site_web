// La carte Mapbox est lourde : elle n'est téléchargée que sur les pages qui
// en affichent une.
import { lazy, Suspense } from 'react'

const CarteMapbox = lazy(() => import('./CarteMapbox'))

export default function Carte(props) {
  return (
    <Suspense fallback={<div className="carte-mapbox" style={{ height: props.hauteur ?? 420, background: '#eef0ee' }} />}>
      <CarteMapbox {...props} />
    </Suspense>
  )
}
