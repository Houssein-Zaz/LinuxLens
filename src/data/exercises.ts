import type { CategoryId } from '../types/command';

export type Level = 1 | 2 | 3;

export const LEVEL_LABEL: Record<Level, string> = { 1: 'Débutant', 2: 'Intermédiaire', 3: 'Avancé' };

interface Base {
  id: string;
  category: CategoryId;
  level: Level;
}

/** Écrire la commande qui réalise une consigne. */
export interface WriteExercise extends Base {
  kind: 'write';
  prompt: string;
  hint: string;
  /** Solutions acceptées ; la première est affichée comme correction. */
  solutions: string[];
  /** Options tolérées en plus (`-v`…). */
  ignoreOptions?: string[];
}

/** QCM : que fait cette commande ? */
export interface QuizExercise extends Base {
  kind: 'quiz';
  command: string;
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
}

/** Conversion de permissions (générée à partir d'un mode). */
export interface PermExercise extends Base {
  kind: 'perm';
  direction: 'to-octal' | 'to-symbolic';
  mode: string;
}

export type Exercise = WriteExercise | QuizExercise | PermExercise;

const write = (e: Omit<WriteExercise, 'kind'>): WriteExercise => ({ kind: 'write', ...e });
const quiz = (e: Omit<QuizExercise, 'kind' | 'question'> & { question?: string }): QuizExercise => ({
  kind: 'quiz',
  question: 'Que fait cette commande ?',
  ...e,
});

export const WRITE_EXERCISES: WriteExercise[] = [
  // Fichiers et répertoires
  write({ id: 'w-pwd', category: 'files', level: 1, prompt: 'Affiche le chemin complet du répertoire courant.', hint: 'Print Working Directory.', solutions: ['pwd'] }),
  write({ id: 'w-ls-la', category: 'files', level: 1, prompt: 'Liste le contenu du répertoire courant en format long, fichiers cachés compris.', hint: 'Deux options de ls : format long et « all ».', solutions: ['ls -la'] }),
  write({ id: 'w-mkdir-p', category: 'files', level: 1, prompt: 'Crée d’un seul coup l’arborescence projet/src/components.', hint: 'mkdir a une option pour créer les répertoires parents manquants.', solutions: ['mkdir -p projet/src/components'], ignoreOptions: ['-v'] }),
  write({ id: 'w-touch', category: 'files', level: 1, prompt: 'Crée un fichier vide nommé notes.txt.', hint: 'La commande qui met à jour la date d’un fichier le crée s’il n’existe pas.', solutions: ['touch notes.txt'] }),
  write({ id: 'w-mv', category: 'files', level: 1, prompt: 'Renomme brouillon.txt en final.txt.', hint: 'Renommer, c’est déplacer vers un nouveau nom.', solutions: ['mv brouillon.txt final.txt'], ignoreOptions: ['-v', '-i'] }),
  write({ id: 'w-cp-r', category: 'files', level: 1, prompt: 'Copie le répertoire photos et tout son contenu vers sauvegarde.', hint: 'cp refuse de copier un répertoire sans l’option récursive.', solutions: ['cp -r photos sauvegarde', 'cp -R photos sauvegarde', 'cp -a photos sauvegarde'], ignoreOptions: ['-v'] }),
  write({ id: 'w-rm-r', category: 'files', level: 2, prompt: 'Supprime le répertoire build et tout son contenu.', hint: 'rm, avec l’option récursive.', solutions: ['rm -r build', 'rm -rf build', 'rm -R build'], ignoreOptions: ['-v'] }),
  write({ id: 'w-find-name', category: 'files', level: 2, prompt: 'Trouve tous les fichiers dont le nom se termine par .log, à partir du répertoire courant.', hint: 'find, un point de départ, puis un test sur le nom. Pensez aux guillemets autour du motif.', solutions: ['find . -name "*.log"', 'find . -type f -name "*.log"', 'find -name "*.log"'] }),
  write({ id: 'w-ln-s', category: 'files', level: 2, prompt: 'Crée un lien symbolique nommé site qui pointe vers /var/www/html.', hint: 'ln -s : la cible d’abord, le nom du lien ensuite.', solutions: ['ln -s /var/www/html site'] }),

  // Lecture
  write({ id: 'w-tail-n', category: 'reading', level: 1, prompt: 'Affiche les 20 dernières lignes de app.log.', hint: 'tail, avec le nombre de lignes voulu.', solutions: ['tail -n 20 app.log', 'tail -20 app.log'] }),
  write({ id: 'w-head', category: 'reading', level: 1, prompt: 'Affiche les 5 premières lignes de /etc/passwd.', hint: 'Le contraire de tail.', solutions: ['head -n 5 /etc/passwd', 'head -5 /etc/passwd'] }),
  write({ id: 'w-tail-f', category: 'reading', level: 2, prompt: 'Suis en temps réel les nouvelles lignes ajoutées à /var/log/syslog.', hint: 'tail peut « suivre » un fichier.', solutions: ['tail -f /var/log/syslog', 'tail -F /var/log/syslog'] }),
  write({ id: 'w-wc-l', category: 'reading', level: 1, prompt: 'Compte le nombre de lignes de data.csv.', hint: 'Word Count, limité aux lignes.', solutions: ['wc -l data.csv', 'wc -l < data.csv', 'cat data.csv | wc -l'] }),

  // Texte
  write({ id: 'w-grep-i', category: 'text', level: 1, prompt: 'Cherche le mot « error » dans app.log, sans tenir compte des majuscules.', hint: 'grep a une option pour ignorer la casse.', solutions: ['grep -i error app.log'] }),
  write({ id: 'w-grep-rn', category: 'text', level: 2, prompt: 'Cherche « TODO » dans tous les fichiers du répertoire src, en affichant les numéros de ligne.', hint: 'Deux options de grep : récursif et numéros de ligne.', solutions: ['grep -rn TODO src'] }),
  write({ id: 'w-grep-v', category: 'text', level: 2, prompt: 'Affiche les lignes de config.conf qui ne commencent PAS par #.', hint: 'grep peut inverser la recherche ; ^ désigne le début de ligne.', solutions: ['grep -v "^#" config.conf'] }),
  write({ id: 'w-sed', category: 'text', level: 2, prompt: 'Affiche le contenu de liens.txt en remplaçant toutes les occurrences de http par https.', hint: 'sed et sa commande s/ancien/nouveau/ ; un drapeau final remplace toutes les occurrences.', solutions: ["sed 's/http/https/g' liens.txt", "sed 's|http|https|g' liens.txt"] }),
  write({ id: 'w-cut', category: 'text', level: 2, prompt: 'Affiche uniquement la première colonne de /etc/passwd, dont les champs sont séparés par « : ».', hint: 'cut avec un délimiteur et un numéro de champ, ou awk avec -F.', solutions: ['cut -d: -f1 /etc/passwd', "awk -F: '{print $1}' /etc/passwd"] }),
  write({ id: 'w-sort-nr', category: 'text', level: 1, prompt: 'Trie les lignes de nombres.txt numériquement, du plus grand au plus petit.', hint: 'sort : tri numérique, ordre inversé.', solutions: ['sort -nr nombres.txt'] }),
  write({ id: 'w-sort-u', category: 'text', level: 2, prompt: 'Affiche les lignes de noms.txt triées et sans doublons.', hint: 'Une option de sort suffit, ou sort suivi d’une autre commande.', solutions: ['sort -u noms.txt', 'sort noms.txt | uniq'] }),
  write({ id: 'w-uniq-c', category: 'text', level: 3, prompt: 'Compte combien de fois chaque ligne apparaît dans mots.txt.', hint: 'uniq sait compter, mais seulement les lignes consécutives : il faut trier avant.', solutions: ['sort mots.txt | uniq -c'] }),

  // Permissions
  write({ id: 'w-chmod-ux', category: 'permissions', level: 1, prompt: 'Rends script.sh exécutable pour son propriétaire (sans toucher aux autres droits).', hint: 'Notation symbolique : u, +, x.', solutions: ['chmod u+x script.sh'] }),
  write({ id: 'w-chmod-755', category: 'permissions', level: 1, prompt: 'Donne les permissions rwxr-xr-x à deploy.sh.', hint: 'rwx = 4+2+1, r-x = 4+0+1.', solutions: ['chmod 755 deploy.sh'] }),
  write({ id: 'w-chmod-600', category: 'permissions', level: 2, prompt: 'Rends cle.pem lisible et modifiable par son seul propriétaire, sans aucun droit pour les autres.', hint: 'rw- pour le propriétaire, rien pour le groupe et les autres.', solutions: ['chmod 600 cle.pem'] }),
  write({ id: 'w-chown-r', category: 'permissions', level: 2, prompt: 'Donne /var/www et tout son contenu à l’utilisateur www-data et au groupe www-data (avec sudo).', hint: 'chown récursif, propriétaire:groupe.', solutions: ['sudo chown -R www-data:www-data /var/www'] }),
  write({ id: 'w-whoami', category: 'permissions', level: 1, prompt: 'Affiche ton nom d’utilisateur.', hint: 'Littéralement : « qui suis-je ? ».', solutions: ['whoami', 'id -un'] }),

  // Processus
  write({ id: 'w-ps-aux', category: 'processes', level: 1, prompt: 'Liste tous les processus du système, avec leur utilisation CPU et mémoire.', hint: 'ps en syntaxe BSD, trois lettres sans tiret.', solutions: ['ps aux'] }),
  write({ id: 'w-ps-grep', category: 'processes', level: 2, prompt: 'Affiche seulement les lignes de la liste des processus qui contiennent « nginx ».', hint: 'Envoyez la sortie de ps dans un filtre.', solutions: ['ps aux | grep nginx', 'ps -ef | grep nginx'] }),
  write({ id: 'w-kill-9', category: 'processes', level: 2, prompt: 'Force l’arrêt immédiat du processus 4242.', hint: 'kill avec le signal SIGKILL.', solutions: ['kill -9 4242', 'kill -KILL 4242', 'kill -SIGKILL 4242', 'kill -s KILL 4242'] }),
  write({ id: 'w-nohup', category: 'processes', level: 3, prompt: 'Lance ./sauvegarde.sh en arrière-plan, de façon qu’il continue même après la fermeture du terminal.', hint: 'Une commande qui ignore SIGHUP, et le caractère qui lance en arrière-plan.', solutions: ['nohup ./sauvegarde.sh &'] }),

  // Système
  write({ id: 'w-df-h', category: 'system', level: 1, prompt: 'Affiche l’espace libre de chaque disque, en unités lisibles.', hint: 'Disk free, human-readable.', solutions: ['df -h'] }),
  write({ id: 'w-du-sh', category: 'system', level: 2, prompt: 'Affiche la taille totale du répertoire Documents, en unités lisibles.', hint: 'Disk usage : total seulement (summarize) et lisible.', solutions: ['du -sh Documents'] }),
  write({ id: 'w-free-h', category: 'system', level: 1, prompt: 'Affiche l’utilisation de la mémoire vive en unités lisibles.', hint: 'Le contraire de « occupé ».', solutions: ['free -h'] }),
  write({ id: 'w-which', category: 'system', level: 1, prompt: 'Affiche le chemin du programme python3 qui sera exécuté.', hint: '« Lequel ? » en anglais.', solutions: ['which python3', 'command -v python3', 'type -p python3'] }),

  // Réseau
  write({ id: 'w-ping-c', category: 'network', level: 1, prompt: 'Envoie exactement 4 paquets ping à google.com.', hint: 'Une option de ping fixe le nombre de paquets (count).', solutions: ['ping -c 4 google.com'] }),
  write({ id: 'w-ssh-p', category: 'network', level: 2, prompt: 'Connecte-toi en SSH au serveur serveur.fr, avec l’utilisateur admin, sur le port 2222.', hint: 'utilisateur@hôte, et l’option de port de ssh (minuscule).', solutions: ['ssh -p 2222 admin@serveur.fr', 'ssh -p 2222 -l admin serveur.fr'] }),
  write({ id: 'w-curl-o', category: 'network', level: 2, prompt: 'Télécharge https://exemple.fr/doc.pdf en gardant son nom de fichier.', hint: 'wget le fait par défaut ; curl a besoin d’une option (O majuscule).', solutions: ['curl -O https://exemple.fr/doc.pdf', 'wget https://exemple.fr/doc.pdf', 'curl -LO https://exemple.fr/doc.pdf'] }),
  write({ id: 'w-scp', category: 'network', level: 3, prompt: 'Envoie rapport.pdf dans le répertoire /tmp du serveur serveur.fr, avec l’utilisateur esprit.', hint: 'Comme cp, mais la destination s’écrit utilisateur@hôte:chemin.', solutions: ['scp rapport.pdf esprit@serveur.fr:/tmp', 'scp rapport.pdf esprit@serveur.fr:/tmp/'] }),

  // Archives
  write({ id: 'w-tar-c', category: 'archives', level: 2, prompt: 'Crée une archive compressée avec gzip, nommée projet.tar.gz, contenant le répertoire projet.', hint: 'tar : créer, gzip, fichier (f en dernier, suivi du nom de l’archive).', solutions: ['tar -czf projet.tar.gz projet'], ignoreOptions: ['-v'] }),
  write({ id: 'w-tar-x', category: 'archives', level: 2, prompt: 'Extrait l’archive projet.tar.gz dans le répertoire courant.', hint: 'tar : extraire, (gzip), fichier.', solutions: ['tar -xzf projet.tar.gz', 'tar -xf projet.tar.gz'], ignoreOptions: ['-v'] }),
  write({ id: 'w-unzip-d', category: 'archives', level: 2, prompt: 'Extrait photos.zip dans le répertoire vacances.', hint: 'unzip et son option de répertoire de destination.', solutions: ['unzip photos.zip -d vacances', 'unzip -d vacances photos.zip'] }),

  // Paquets
  write({ id: 'w-apt-update', category: 'packages', level: 1, prompt: 'Rafraîchis la liste des paquets disponibles (sans rien installer).', hint: 'apt avec sudo ; ce n’est pas upgrade.', solutions: ['sudo apt update', 'sudo apt-get update'] }),
  write({ id: 'w-apt-install', category: 'packages', level: 1, prompt: 'Installe le paquet htop.', hint: 'sudo, apt, et la sous-commande d’installation.', solutions: ['sudo apt install htop', 'sudo apt-get install htop'], ignoreOptions: ['-y'] }),

  // Shell et divers
  write({ id: 'w-echo-redir', category: 'misc', level: 1, prompt: 'Écris « Bonjour » dans le fichier salut.txt, en remplaçant son contenu.', hint: 'echo, et la redirection qui écrase.', solutions: ['echo Bonjour > salut.txt'] }),
  write({ id: 'w-echo-append', category: 'misc', level: 1, prompt: 'Ajoute la ligne « fin » à la fin de journal.txt, sans effacer ce qu’il contient.', hint: 'La redirection qui ajoute a deux chevrons.', solutions: ['echo fin >> journal.txt'] }),
  write({ id: 'w-echo-path', category: 'misc', level: 1, prompt: 'Affiche la valeur de la variable PATH.', hint: 'Une variable se lit avec $.', solutions: ['echo $PATH', 'printenv PATH'] }),
  write({ id: 'w-count-files', category: 'misc', level: 2, prompt: 'Compte le nombre d’éléments du répertoire courant (en une ligne, avec un pipe).', hint: 'La liste des fichiers, envoyée à un compteur de lignes.', solutions: ['ls | wc -l'] }),
  write({ id: 'w-xargs', category: 'misc', level: 3, prompt: 'Trouve tous les fichiers .tmp sous le répertoire courant et supprime-les, en passant la liste à rm avec xargs.', hint: 'find … | xargs rm', solutions: ['find . -name "*.tmp" | xargs rm', 'find . -type f -name "*.tmp" | xargs rm'] }),
  write({ id: 'w-tee', category: 'misc', level: 3, prompt: 'Lance npm run build en affichant la sortie à l’écran ET en l’enregistrant dans build.log.', hint: 'Une commande qui fait un « T » dans le pipe.', solutions: ['npm run build | tee build.log'] }),
];

export const QUIZ_EXERCISES: QuizExercise[] = [
  quiz({ id: 'q-rm-rf', category: 'files', level: 1, command: 'rm -rf /tmp/test', choices: ['Supprime /tmp/test et tout son contenu, sans demander de confirmation', 'Supprime /tmp/test seulement s’il est vide', 'Déplace /tmp/test dans la corbeille', 'Demande une confirmation pour chaque fichier de /tmp/test'], answer: 0, explanation: '-r supprime récursivement le contenu, -f n’affiche aucune confirmation. Il n’y a pas de corbeille en ligne de commande.' }),
  quiz({ id: 'q-ls-lt', category: 'files', level: 2, command: 'ls -lt | head -5', choices: ['Les 5 fichiers les plus volumineux', 'Les 5 premiers fichiers par ordre alphabétique', 'Les fichiers modifiés le plus récemment (la 1ʳᵉ ligne est le total)', 'Les 5 fichiers les plus anciens'], answer: 2, explanation: '-t trie par date de modification, du plus récent au plus ancien ; head garde les 5 premières lignes, dont la ligne « total ».' }),
  quiz({ id: 'q-grep-v', category: 'text', level: 2, command: 'grep -v "^#" config.conf', choices: ['Affiche seulement les commentaires', 'Affiche les lignes qui ne commencent pas par #', 'Supprime les commentaires du fichier', 'Compte les lignes commençant par #'], answer: 1, explanation: '-v inverse la recherche et ^# désigne un # en début de ligne. Le fichier lui-même n’est pas modifié.' }),
  quiz({ id: 'q-chmod-640', category: 'permissions', level: 1, command: 'chmod 640 secret.txt', choices: ['Propriétaire : lecture et écriture ; groupe : lecture ; autres : rien', 'Propriétaire : tout ; groupe : lecture ; autres : rien', 'Tout le monde peut lire, seul le propriétaire écrit', 'Propriétaire : lecture ; groupe : écriture ; autres : rien'], answer: 0, explanation: '6 = 4+2 (rw-), 4 = r--, 0 = ---. Résultat : rw-r-----.' }),
  quiz({ id: 'q-redirect-both', category: 'misc', level: 2, command: 'make > build.log 2>&1', choices: ['Seules les erreurs vont dans build.log', 'La sortie va dans build.log et les erreurs restent à l’écran', 'La sortie et les erreurs vont toutes deux dans build.log', 'La sortie est ajoutée à la fin de build.log'], answer: 2, explanation: '> envoie la sortie standard dans build.log, puis 2>&1 envoie les erreurs au même endroit que la sortie standard.' }),
  quiz({ id: 'q-and', category: 'misc', level: 1, command: 'mkdir projet && cd projet', question: 'Quand cd projet s’exécute-t-il ?', choices: ['Toujours, après mkdir', 'Seulement si mkdir a réussi', 'Seulement si mkdir a échoué', 'En même temps que mkdir'], answer: 1, explanation: '&& n’exécute la commande suivante que si la précédente a réussi (code de retour 0).' }),
  quiz({ id: 'q-or', category: 'misc', level: 2, command: 'ping -c 1 serveur || echo "injoignable"', question: 'Quand le message « injoignable » s’affiche-t-il ?', choices: ['Toujours', 'Si le ping réussit', 'Si le ping échoue', 'Jamais : || est un pipe double'], answer: 2, explanation: '|| exécute la commande suivante uniquement si la précédente échoue.' }),
  quiz({ id: 'q-tar-t', category: 'archives', level: 2, command: 'tar -tf sauvegarde.tar', choices: ['Extrait l’archive', 'Teste que l’archive n’est pas corrompue', 'Liste le contenu de l’archive sans l’extraire', 'Crée une archive nommée sauvegarde.tar'], answer: 2, explanation: '-t (list) liste le contenu ; -f indique le fichier d’archive.' }),
  quiz({ id: 'q-kill', category: 'processes', level: 2, command: 'kill 1234', question: 'Quel signal est envoyé au processus 1234 ?', choices: ['SIGKILL : arrêt immédiat', 'SIGTERM : demande d’arrêt propre', 'SIGHUP : rechargement', 'Aucun : kill affiche seulement des informations'], answer: 1, explanation: 'Sans option, kill envoie SIGTERM (15), que le programme peut intercepter pour se fermer proprement.' }),
  quiz({ id: 'q-find-empty', category: 'files', level: 2, command: 'find . -type d -empty', choices: ['Supprime les répertoires vides', 'Liste les répertoires vides sous le répertoire courant', 'Liste les fichiers de taille 0', 'Compte les répertoires'], answer: 1, explanation: '-type d limite aux répertoires, -empty ne garde que les vides. Sans -delete, find ne fait qu’afficher.' }),
  quiz({ id: 'q-du-sort', category: 'system', level: 3, command: 'du -sh * | sort -rh | head -3', choices: ['Les 3 éléments les plus volumineux du répertoire courant', 'L’espace libre des 3 premiers disques', 'Les 3 fichiers les plus récents', 'Les 3 plus petits éléments'], answer: 0, explanation: 'du -sh donne la taille de chaque élément, sort -rh les trie du plus gros au plus petit en comprenant les unités, head garde les 3 premiers.' }),
  quiz({ id: 'q-sort-uniq', category: 'text', level: 2, command: 'sort visites.log | uniq -c', choices: ['Supprime les doublons de visites.log', 'Compte le nombre d’occurrences de chaque ligne', 'Compte le nombre total de lignes', 'Trie les lignes par fréquence'], answer: 1, explanation: 'sort regroupe les lignes identiques, puis uniq -c affiche chaque ligne précédée de son nombre d’occurrences (le résultat n’est pas trié par fréquence).' }),
  quiz({ id: 'q-nohup', category: 'processes', level: 3, command: 'nohup ./job.sh > job.log 2>&1 &', choices: ['Lance job.sh au premier plan et enregistre sa sortie', 'Lance job.sh en arrière-plan ; il continue après la fermeture du terminal', 'Planifie job.sh pour plus tard', 'Lance job.sh avec les droits root'], answer: 1, explanation: 'nohup ignore le signal de fermeture du terminal, & lance en arrière-plan, et la sortie comme les erreurs vont dans job.log.' }),
  quiz({ id: 'q-ssh-l', category: 'network', level: 3, command: 'ssh -L 8080:localhost:80 serveur', choices: ['Rend le port 80 du serveur accessible sur le port 8080 de votre machine', 'Ouvre le port 8080 du serveur au public', 'Connecte-vous au serveur sur le port 8080', 'Redirige tout votre trafic web vers le serveur'], answer: 0, explanation: '-L crée un tunnel local : localhost:8080 sur votre machine mène au port 80 vu depuis le serveur.' }),
  quiz({ id: 'q-sudo-tee', category: 'permissions', level: 3, command: 'echo "127.0.0.1 dev.local" | sudo tee -a /etc/hosts', question: 'Pourquoi utiliser sudo tee plutôt que sudo echo … >> /etc/hosts ?', choices: ['tee est plus rapide qu’echo', 'La redirection >> est faite par votre shell, sans privilèges : seul tee, lancé avec sudo, peut écrire', 'echo ne sait pas écrire dans un fichier', 'Il n’y a aucune différence'], answer: 1, explanation: 'Dans sudo echo … >> fichier, sudo ne s’applique qu’à echo ; l’ouverture du fichier est faite par votre shell, sans les droits root.' }),
  quiz({ id: 'q-apt-update', category: 'packages', level: 1, command: 'sudo apt update', choices: ['Installe les mises à jour de tous les paquets', 'Met à jour apt lui-même', 'Télécharge la liste à jour des paquets disponibles, sans rien installer', 'Met à jour le noyau Linux'], answer: 2, explanation: 'update rafraîchit seulement la liste des versions ; c’est apt upgrade qui installe les nouvelles versions.' }),
];

/** Modes utilisés pour les exercices de conversion. */
const PERM_MODES: Array<{ mode: string; level: Level }> = [
  { mode: '644', level: 1 },
  { mode: '755', level: 1 },
  { mode: '600', level: 1 },
  { mode: '700', level: 1 },
  { mode: '750', level: 2 },
  { mode: '640', level: 2 },
  { mode: '664', level: 2 },
  { mode: '711', level: 2 },
  { mode: '444', level: 2 },
  { mode: '4755', level: 3 },
  { mode: '1777', level: 3 },
  { mode: '2770', level: 3 },
];

/** Un exercice par mode, en alternant le sens de conversion. */
export const PERM_EXERCISES: PermExercise[] = PERM_MODES.map(({ mode, level }, i) => {
  const direction = i % 2 === 0 ? 'to-octal' : 'to-symbolic';
  return { id: `p-${direction}-${mode}`, kind: 'perm', category: 'permissions', level, direction, mode };
});

export const ALL_EXERCISES: Exercise[] = [...WRITE_EXERCISES, ...QUIZ_EXERCISES, ...PERM_EXERCISES];
