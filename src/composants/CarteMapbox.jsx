// Carte Mapbox GL JS (même jeton public que l'appli). Les repères des
// alertes sont colorés par type ; les urgences en cours pulsent.
import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { TYPES } from '../noyau/alertes'
import { CENTRE_ABIDJAN } from '../noyau/outils'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_JETON

/**
 * alertes : alertes à montrer (celles qui ont une position).
 * auChoix : appelé avec l'alerte touchée.
 * centre : [longitude, latitude] du centre de départ.
 * maPosition : { latitude, longitude } pour le point bleu.
 * relief : vue inclinée avec bâtiments en 3D.
 */
export default function CarteMapbox({ alertes = [], auChoix, centre, zoom = 12, maPosition, relief = false, hauteur = 420 }) {
  const conteneur = useRef(null)
  const carte = useRef(null)
  const reperes = useRef([])

  useEffect(() => {
    const instance = new mapboxgl.Map({
      container: conteneur.current,
      style: relief ? 'mapbox://styles/mapbox/standard' : 'mapbox://styles/mapbox/streets-v12',
      center: centre || CENTRE_ABIDJAN,
      zoom,
      pitch: relief ? 50 : 0,
      language: 'fr',
    })
    instance.addControl(new mapboxgl.NavigationControl({ showCompass: relief }), 'top-right')
    carte.current = instance
    return () => instance.remove()
    // La carte est créée une seule fois.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Repères des alertes (et ma position), refaits quand la liste change.
  useEffect(() => {
    const instance = carte.current
    if (!instance) return
    reperes.current.forEach((r) => r.remove())
    reperes.current = []
    for (const a of alertes) {
      if (a.latitude == null || a.longitude == null) continue
      const element = document.createElement('div')
      element.className = `marqueur${a.type === 'urgence' && a.statut === 'en_cours' ? ' pulse' : ''}`
      element.style.background = TYPES[a.type].couleur
      element.title = a.categorie
      if (auChoix) element.addEventListener('click', () => auChoix(a))
      reperes.current.push(new mapboxgl.Marker({ element }).setLngLat([a.longitude, a.latitude]).addTo(instance))
    }
    if (maPosition) {
      const point = document.createElement('div')
      point.className = 'marqueur'
      point.style.background = '#1a73e8'
      point.title = 'Ma position'
      reperes.current.push(
        new mapboxgl.Marker({ element: point }).setLngLat([maPosition.longitude, maPosition.latitude]).addTo(instance),
      )
    }
  }, [alertes, auChoix, maPosition])

  return <div ref={conteneur} className="carte-mapbox" style={{ height: hauteur }} />
}
