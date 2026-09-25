import type { CategoryId } from '../types/command';

export interface Category {
  id: CategoryId;
  label: string;
  description: string;
}

export const CATEGORIES: Category[] = [
  { id: 'files', label: 'Fichiers et répertoires', description: 'Naviguer, créer, copier, déplacer et supprimer.' },
  { id: 'reading', label: 'Lecture de fichiers', description: 'Afficher et comparer le contenu des fichiers.' },
  { id: 'text', label: 'Traitement de texte', description: 'Filtrer, transformer et trier du texte.' },
  { id: 'permissions', label: 'Permissions et utilisateurs', description: 'Droits d’accès, propriétaires et comptes.' },
  { id: 'processes', label: 'Processus', description: 'Lister, surveiller et arrêter des programmes.' },
  { id: 'system', label: 'Système', description: 'Disques, mémoire, date et informations système.' },
  { id: 'network', label: 'Réseau', description: 'Connexions, transferts et configuration réseau.' },
  { id: 'archives', label: 'Archives et compression', description: 'Regrouper et compresser des fichiers.' },
  { id: 'packages', label: 'Paquets', description: 'Installer et gérer des logiciels.' },
  { id: 'misc', label: 'Shell et divers', description: 'Variables, alias et outils du shell.' },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, Category>;
