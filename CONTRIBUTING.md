# Contribution

1. Créer une branche depuis `main`.
2. Installer les dépendances avec `npm ci`.
3. Ajouter ou mettre à jour les tests avec chaque changement fonctionnel.
4. Exécuter `npm run quality` et `docker compose config --quiet`.
5. Utiliser un message de commit court à l'impératif.

Les controllers traduisent HTTP, les services portent les règles métier et les repositories sont les seuls
composants autorisés à exécuter du SQL.
