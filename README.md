# StarPole - site web

Version web de StarPole (React JS + Vite), branchée sur le même Firebase (`starpole-3d84d`) et le même serveur FastAPI que l'appli Android. Une alerte publiée sur le site apparaît dans l'appli, et l'inverse.

## Lancer en local

```
npm install
npm run dev
```

Puis ouvrir http://localhost:5173

La configuration (Firebase web, jeton public Mapbox, adresse du serveur) est dans `.env.local`, ignoré par Git. Le modèle est `.env.exemple`.

## Vérifier

```
npm run build
npm run lint
```

## Ce que fait le site

- Connexion : e-mail avec code à 4 chiffres (serveur FastAPI) ou Google. Case des conditions obligatoire pour s'inscrire.
- Accueil : position, recherche, tuiles urgences, aides et dons qui trient les alertes à proximité.
- Alertes : détails (photo entière, carte, distance), « Je peux aider », suivi (timeline, messages d'avancement, « Terminé » pour l'auteur seul, « Stopper » avec confirmation), itinéraire Google Maps, partage.
- Publier : type, titre, description, position, photo obligatoire. L'alerte est en ligne tout de suite, puis vérifiée par l'IA côté serveur (retirée si elle n'est pas conforme).
- Carte : Mapbox, repères par type, les urgences pulsent, filtre.
- Messagerie : conversations, nouvelle conversation par numéro ou e-mail, réponse à un message, modification de ses messages, coches (envoyé, reçu, vu).
- Profil : photo, nom, numéro, mes alertes et aides, déconnexion.

## Pas sur le site (réservé à l'appli Android)

Appels voix et vidéo, notifications, contacts du téléphone.

## En ligne

Le site est hébergé gratuitement sur Firebase Hosting (site `starpole-web` du projet `starpole-3d84d`) :
https://starpole-web.web.app

Pour redéployer après une modification :

```
npm run build
firebase deploy --only hosting --project starpole-3d84d
```

Le serveur FastAPI autorise cette adresse (CORS). Pour la connexion Google, l'adresse doit aussi être dans Firebase Authentication, Paramètres, Domaines autorisés.
