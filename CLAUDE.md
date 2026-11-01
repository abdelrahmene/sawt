# Sawt — notes pour Claude

Lis ceci en entier avant de toucher au code. C'est court et ça évite de refaire
les erreurs déjà faites.

## Ce que c'est

Un agent qui fait le marketing d'une petite boutique algérienne : on lui parle,
en **darija**, et il écrit les pages, dessine les visuels, prépare les
campagnes et répond aux clients.

**Soumission au Meta Global AI Developer Hackathon, piste Indie.**
Dépôt le **4 novembre 2026 avant 21 h ET**. Le barème : Impact 30 % · usage des
outils Meta 25 % · profondeur technique 20 % · démonstration 25 %.
Règle écrite du concours : **seul le travail fait pendant l'événement compte**
(27 oct – 4 nov). Ne rien importer d'un autre dépôt.

## Le faire tourner

```bash
npm start          # → http://localhost:7070   (aucun npm install, zéro dépendance)
```

**Node 22.5 minimum** — la base de données utilise `node:sqlite`, intégré à
Node. En dessous, `src/preflight.js` affiche un message clair et s'arrête.

Sans clé, l'app s'ouvre et l'indique dans le coin, mais les modèles ne
répondent pas. Pour qu'ils répondent : `cp .env.example .env` puis demander les
clés à Abdelrahmene (`MODEL_API_KEY`, `BASETEN_API_KEY`).
**Ne jamais committer `.env`, ne jamais montrer une clé dans une capture ou
dans la vidéo.**

`ffmpeg` doit être dans le PATH : il convertit les vocaux en WAV et recadre les
images. C'est la seule dépendance externe.

### Commandes utiles

```bash
npm run baseten                    # mesure ce que les poids ouverts savent faire (~25 s)
npm run turn <session> "<phrase>"  # un tour d'agent, lisible en console
npm run try-landing "produit" 4500 /out/une-image.png
npm run bench                      # le banc darija (attend des clips dans bench/clips/)
```

Tout ce que l'agent produit atterrit dans `out/` (ignoré par git) : base
SQLite, pages, visuels, photos. Supprimer `out/` remet à zéro.

## La carte

```
src/server.js          tout sur un port, sans dépendance. Routes /api/*
src/db.js              SQLite. Le schéma est commenté ligne à ligne, lis-le d'abord
src/agent/
  loop.js              le tour d'agent : modèle → outils → modèle
  tools.js             ce que l'agent a le droit de faire
  system.js            qui il est, et les 12 règles qu'il ne contourne pas
  briefing.js          l'état du compte, injecté à chaque tour (voir plus bas)
src/catalog.js         le catalogue fournisseur et l'entrée d'un produit en boutique
src/models/            llm · vision · voice · image · segment (sam-3.1)
src/meta-sim/          le côté Facebook, mis en scène : connect · inbox · campaigns
src/creative/          landing-content (texte) · scenes (visuels) · landing-render (mise en page)
src/sites.js           sites, pages, domaines (vraie résolution DNS)
fixtures/catalog.json  10 produits fournisseur + fixtures/catalog/*.webp, leurs photos
web/                   l'interface : app · chat · catalog · studio · sites · campaigns · inbox · meta · settings
web/i18n.js            la couche de langue ; un dictionnaire par écran dans web/i18n/
```

## Les trois langues

**L'anglais est la langue par défaut de l'interface** — la soumission se juge
en anglais. Le marchand bascule en darija ou en français avec le bouton
`EN/AR/FR` de la barre du haut ; en darija le document passe en RTL et toute
la feuille de style suit, parce qu'elle est écrite en propriétés logiques.

Une chaîne visible par le marchand ne s'écrit JAMAIS en dur : elle va dans
`web/i18n/<écran>.js`, clé d'abord, `{en, ar, fr}` à l'intérieur. Deux chaînes
vivent dans des `content:` CSS que JavaScript ne peut pas atteindre —
`i18n.js` les injecte en variables personnalisées, ne pas les réécrire en dur.
Les commentaires du code, eux, restent en français.

## La coque téléphone

`data-shell="phone"` est le défaut, y compris sur un écran de bureau : le
marchand tient son commerce dans une main, et une application qu'on ne teste
qu'en 1440 px révèle ses défauts le jour de la démonstration. Le bouton en
haut à droite repasse en pleine largeur pour les tableaux denses.
**Tester à 390 px d'abord.**

**`briefing.js` est le fichier qui a rendu l'agent intelligent.** Avant lui,
chaque tour repartait de zéro : il redemandait le nom de la boutique, proposait
des pages qui existaient déjà, ignorait les clients en attente. Maintenant le
tour s'ouvre sur un état : ce qui existe, ce qui est connecté, qui attend, et
dans quel sens va le coût par commande. Si l'agent paraît bête, regarde là en
premier.

## Les règles qui ne se négocient pas

Elles ne sont pas décoratives : chacune vient d'un vrai problème.

1. **Un détail manquant est une question, jamais une supposition.** La
   transcription perd des mots, et toujours celui qui compte — la pointure, la
   commune. L'agent demande au lieu de déduire. Même chose côté clients : il ne
   connaît pas le stock par pointure, ni les frais par wilaya, ni où est un
   colis, ni si le produit est authentique. Il refuse et rend la main.
2. **Ce qui est simulé est marqué « SIMULÉ ».** Le côté Facebook est une mise
   en scène — exigée par les organisateurs, pour qu'un juré puisse lancer le
   projet sans compte Meta. Un chiffre simulé qui ressemble à une mesure est la
   seule faute que ce projet ne peut pas se permettre.
3. **Aucun faux témoignage, aucune fausse urgence.** Les interrupteurs existent
   dans le Studio, éteints, avec la raison écrite à côté. Une preuve fabriquée
   sur une page soumise à Meta fait fermer un compte publicitaire.
4. **Ne jamais rendre un logo plus lisible qu'il ne l'était** (`GARDE_MARQUE`
   dans `src/models/image.js`). Mesuré : une patte rouge illisible sur la photo
   d'origine est ressortie en « PRA… » après réédition. L'outil avait fabriqué
   une contrefaçon plus convaincante que l'originale.
5. **Aucune donnée réelle de client dans le dépôt.** Les conversations d'une
   Page sont des Platform Data. Les huit clients de la boîte de réception sont
   inventés pour la démonstration, et c'est écrit dans `src/meta-sim/inbox.js`.
6. **Zéro dépendance.** `package.json` a un `dependencies` vide et doit le
   rester : un juré doit pouvoir faire `git clone` puis `npm start`. Si une
   bibliothèque semble indispensable, elle ne l'est probablement pas — ffmpeg
   recadre les images parce qu'il était déjà là pour l'audio.

## Pièges déjà rencontrés — ne pas les refaire

- **`flex-shrink` vaut 1 par défaut.** Dans une colonne flex à hauteur
  contrainte, les cartes se compriment, `scrollHeight === clientHeight`, et
  plus rien ne défile. D'où `#canvas > * { flex: 0 0 auto }`.
- **Un prix dans un paragraphe arabe est réordonné** : « 4 500 DA » s'affiche
  « DA 500 4 ». Toujours `<bdi dir="ltr">`.
- **Révéler au défilement cache le contenu si l'observateur ne part pas** — en
  impression, en PDF, en capture pleine page. Le contenu est visible par
  défaut ; c'est le script qui le masque, et un délai de 3 s le rattrape.
- **Un artefact d'une version précédente peut vider l'écran au rejeu.** Chaque
  rendu d'artefact est sous `try/catch`.
- **Les tests se trompent plus souvent que le système.** Trois fois dans la
  même journée : un pixel 1×1 pour tester la vision ne distingue pas « il
  voit » de « il devine » ; une liste de mots attendus écrite de mémoire a
  compté en échec une réponse exacte. Quand une mesure dit qu'un modèle a tort,
  **regarder l'image avant de conclure**.
- **`sam-3.1` n'est ni sur `/chat/completions` ni sur `/images/edits`** — l'API
  renvoie vers `/v1/responses`, avec `input_text` + `input_image`. Elle répond
  en jetons (`<|box;…|>`), pas en JSON. On lit la boîte, on ignore le masque,
  et c'est écrit dans le code.

## Ce que Meta ne propose PAS — vérifié, pas supposé

`GET /v1/models` ne liste que **neuf** modèles : `muse-spark` 1.1 à 1.3,
`muse-image-1.0`, `muse-voice-transcribe-1.0`, `muse-wonder-1.0`, `sam-3.1`.

- **Il n'existe aucun « Muse Code ».** Cinq variantes d'identifiant essayées
  le 01/11/2026, `404 model_not_found` sur toutes. Le site et les pages sont
  écrits par `muse-spark-1.3`. **Ne rien prétendre d'autre dans le README** :
  une affirmation que le dépôt ne soutient pas coûte des points.
- **`tool_choice` n'accepte que `"auto"`.** `"required"` et un outil nommé
  renvoient un 400 explicite. On ne peut donc pas forcer un appel d'outil ;
  le seul levier est de ne mettre qu'UN outil dans `tools`.
- La liaison vers `api.meta.ai` depuis Alger lâche souvent (4 appels sur 13
  en `UND_ERR_CONNECT_TIMEOUT`). `llm.js` reprend deux fois, jamais après le
  premier jeton. **Ne pas enregistrer la vidéo sur un appel en direct.**

## Où ça en est

**Fait** : la base, les écrans, le flux Meta mis en scène, la boîte de
réception avec les refus, le studio, les campagnes et leurs KPI, le chemin
poids ouverts (mesuré, basculable), sam-3.1, `restyle_photo`, la boucle
campagne → résultats → décision déroulée en entier, les trois langues, la
coque téléphone, le **catalogue fournisseur** (browse → import → page →
campagne, vérifié de bout en bout), et la **fidélité des images** : les
scènes d'une landing partent de la photo du produit via `/images/edits`, plus
d'une description.

**Reste à faire, par ordre d'importance :**

1. **Les 20 vocaux darija** dans `bench/clips/`, puis `npm run bench` pour
   produire le tableau du README. C'est le chemin critique et seul Abdelrahmene
   peut les enregistrer — sa voix ou celle d'une personne consentante,
   **jamais** l'audio d'un vrai client.
2. L'hébergement public sur **Modal**, jamais sur le VPS de production.
3. La vidéo de 3 minutes, puis le dépôt.

⚠️ **« Use of Meta AI Tooling » (25 %) désigne les MODÈLES**, pas la plateforme
publicitaire : `muse-spark`, `muse-image`, `sam-3.1`, `muse-voice-transcribe`.
Un dossier chargé d'appels Marketing API peut même être mal trié au premier
tour. Le pixel de `src/creative/pixel.js` est là pour le produit — une page
COD que la campagne ne peut pas mesurer est incomplète — pas pour la note.

⚠️ **Aucune marque dans la démonstration.** Les premières pages d'essai
portaient sur un polo Casablanca, une Prada et une Adidas — toutes des
répliques, et le règlement a une clause « trademark ». Le catalogue embarqué
est sans marque par construction ; garder cette règle pour tout ce qui passe
à l'écran.

## Comment travailler ici

Le français est la langue de travail. Les commentaires expliquent **pourquoi**,
pas quoi — et quand un commentaire cite une mesure, c'est une vraie mesure.
Ne pas en inventer.

Vérifier en regardant, pas en supposant : le serveur tourne sur `:7070`, les
pages générées s'ouvrent dans un navigateur, et une capture d'écran vaut mieux
qu'une déduction. Ce projet est jugé sur une démonstration de trois minutes —
ce qui n'a pas été vu à l'écran n'existe pas.
