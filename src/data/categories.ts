import type { CategoryId } from '../types/command';
import { withEnglish } from '../i18n';

export interface Category {
  id: CategoryId;
  label: string;
  description: string;
}

const category = (c: Category, en: Pick<Category, 'label' | 'description'>): Category => withEnglish(c, en);

export const CATEGORIES: Category[] = [
  category(
    { id: 'files', label: 'Fichiers et répertoires', description: 'Naviguer, créer, copier, déplacer et supprimer.' },
    { label: 'Files and directories', description: 'Navigate, create, copy, move and delete.' },
  ),
  category(
    { id: 'reading', label: 'Lecture de fichiers', description: 'Afficher et comparer le contenu des fichiers.' },
    { label: 'Reading files', description: 'Display and compare file contents.' },
  ),
  category(
    { id: 'text', label: 'Traitement de texte', description: 'Filtrer, transformer et trier du texte.' },
    { label: 'Text processing', description: 'Filter, transform and sort text.' },
  ),
  category(
    { id: 'permissions', label: 'Permissions et utilisateurs', description: 'Droits d’accès, propriétaires et comptes.' },
    { label: 'Permissions and users', description: 'Access rights, owners and accounts.' },
  ),
  category(
    { id: 'processes', label: 'Processus', description: 'Lister, surveiller et arrêter des programmes.' },
    { label: 'Processes', description: 'List, monitor and stop programs.' },
  ),
  category(
    { id: 'system', label: 'Système', description: 'Disques, mémoire, date et informations système.' },
    { label: 'System', description: 'Disks, memory, date and system information.' },
  ),
  category(
    { id: 'network', label: 'Réseau', description: 'Connexions, transferts et configuration réseau.' },
    { label: 'Network', description: 'Connections, transfers and network configuration.' },
  ),
  category(
    { id: 'archives', label: 'Archives et compression', description: 'Regrouper et compresser des fichiers.' },
    { label: 'Archives and compression', description: 'Bundle and compress files.' },
  ),
  category(
    { id: 'packages', label: 'Paquets', description: 'Installer et gérer des logiciels.' },
    { label: 'Packages', description: 'Install and manage software.' },
  ),
  category(
    { id: 'misc', label: 'Shell et divers', description: 'Variables, alias et outils du shell.' },
    { label: 'Shell and misc', description: 'Variables, aliases and shell tools.' },
  ),
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, Category>;
