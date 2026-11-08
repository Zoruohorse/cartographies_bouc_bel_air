# Cartographie MRS6 — Bouc-Bel-Air

Cartographie statique sur GitHub Pages, avec deux vues : cartes d'acteurs et réseau relationnel.

## Vue cartes : cinq onglets

1. **Cartographie des acteurs** : fiches, positions, preuves historiques du référentiel.
2. **Synthèse des oppositions** : griefs attribués, préexistants.
3. **Points de vigilance et sources** : limites de la base et documentation.
4. **Évolution des acteurs** : histogramme des premières apparitions documentaires datées et sourcées, affichage mensuel « Nouveaux » et « Cumulés », filtres de typologies, liste des acteurs non datables.
5. **Chronologie** : événements administratifs, prises de position datées, étapes de raccordement RTE et repères techniques, avec sources et distinction faits/prévisions.

La mise à jour du **8 novembre 2026** crée `data/timeline.json` et ajoute 16 jalons et 9 repères techniques à `data/content.json`. **8 acteurs sur 11** ont une première date exploitable, les 3 autres sont présentés « à qualifier » sans date fictive.

La date de première apparition dans une source n'est **pas** nécessairement celle de la première prise de position de l'acteur. La catégorisation du graphique reflète le rôle de l'acteur et non son degré de soutien au projet.

**Traçabilité :** les informations des nouveaux onglets sont rattachées à des preuves et des URLs dans `data/evidence.json` et `data/sources.json`. Les onze fiches historiques, leurs positions et les relations de réseau n'ont pas été réécrites ; leurs onze anciennes preuves restent sans URL qualifiée et ne servent pas à alimenter les nouveaux onglets. Les deux sources historiques sans URL sont conservées comme références non qualifiées.

L'audit est disponible dans `data/audit_2026-11-08.json`. Exécuter `python validate.py` pour vérifier les références, la chronologie et les fichiers de l'interface.

## Navigation

- [Cartes et 5 onglets](apps/cards/)
- [Vue réseau](apps/network/)
