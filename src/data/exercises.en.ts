/**
 * Traduction anglaise des exercices, par identifiant. Les solutions et les commandes ne changent pas :
 * la correction et la progression sont les mêmes dans les deux langues.
 */

export const WRITE_EN: Record<string, { prompt: string; hint: string }> = {
  // Files and directories
  'w-pwd': { prompt: 'Print the full path of the current directory.', hint: 'Print Working Directory.' },
  'w-ls-la': { prompt: 'List the contents of the current directory in long format, hidden files included.', hint: 'Two ls options: long format and “all”.' },
  'w-mkdir-p': { prompt: 'Create the whole tree projet/src/components in one go.', hint: 'mkdir has an option to create missing parent directories.' },
  'w-touch': { prompt: 'Create an empty file named notes.txt.', hint: 'The command that updates a file’s timestamp creates it if it does not exist.' },
  'w-mv': { prompt: 'Rename brouillon.txt to final.txt.', hint: 'Renaming is moving to a new name.' },
  'w-cp-r': { prompt: 'Copy the photos directory and everything in it to sauvegarde.', hint: 'cp refuses to copy a directory without the recursive option.' },
  'w-rm-r': { prompt: 'Delete the build directory and everything in it.', hint: 'rm, with the recursive option.' },
  'w-find-name': {
    prompt: 'Find every file whose name ends in .log, starting from the current directory.',
    hint: 'find, a starting point, then a test on the name. Remember the quotes around the pattern.',
  },
  'w-ln-s': { prompt: 'Create a symbolic link named site that points to /var/www/html.', hint: 'ln -s: the target first, the link name second.' },

  // Reading
  'w-tail-n': { prompt: 'Show the last 20 lines of app.log.', hint: 'tail, with the number of lines you want.' },
  'w-head': { prompt: 'Show the first 5 lines of /etc/passwd.', hint: 'The opposite of tail.' },
  'w-tail-f': { prompt: 'Follow the new lines added to /var/log/syslog in real time.', hint: 'tail can “follow” a file.' },
  'w-wc-l': { prompt: 'Count the number of lines in data.csv.', hint: 'Word Count, limited to lines.' },

  // Text
  'w-grep-i': { prompt: 'Search for the word “error” in app.log, ignoring case.', hint: 'grep has an option to ignore case.' },
  'w-grep-rn': { prompt: 'Search for “TODO” in every file of the src directory, showing line numbers.', hint: 'Two grep options: recursive and line numbers.' },
  'w-grep-v': { prompt: 'Show the lines of config.conf that do NOT start with #.', hint: 'grep can invert the search; ^ means the start of a line.' },
  'w-sed': {
    prompt: 'Show the contents of liens.txt, replacing every occurrence of http with https.',
    hint: 'sed and its s/old/new/ command; a final flag replaces every occurrence.',
  },
  'w-cut': {
    prompt: 'Show only the first column of /etc/passwd, whose fields are separated by “:”.',
    hint: 'cut with a delimiter and a field number, or awk with -F.',
  },
  'w-sort-nr': { prompt: 'Sort the lines of nombres.txt numerically, from largest to smallest.', hint: 'sort: numeric sort, reverse order.' },
  'w-sort-u': { prompt: 'Show the lines of noms.txt sorted and without duplicates.', hint: 'One sort option is enough, or sort followed by another command.' },
  'w-uniq-c': {
    prompt: 'Count how many times each line appears in mots.txt.',
    hint: 'uniq can count, but only consecutive lines: you need to sort first.',
  },

  // Permissions
  'w-chmod-ux': { prompt: 'Make script.sh executable for its owner (without touching the other permissions).', hint: 'Symbolic notation: u, +, x.' },
  'w-chmod-755': { prompt: 'Give deploy.sh the permissions rwxr-xr-x.', hint: 'rwx = 4+2+1, r-x = 4+0+1.' },
  'w-chmod-600': {
    prompt: 'Make cle.pem readable and writable by its owner only, with no permissions for anyone else.',
    hint: 'rw- for the owner, nothing for the group and others.',
  },
  'w-chown-r': {
    prompt: 'Give /var/www and everything in it to the user www-data and the group www-data (with sudo).',
    hint: 'Recursive chown, owner:group.',
  },
  'w-whoami': { prompt: 'Print your user name.', hint: 'Literally: “who am I?”.' },

  // Processes
  'w-ps-aux': { prompt: 'List every process on the system, with its CPU and memory usage.', hint: 'ps in BSD syntax, three letters without a dash.' },
  'w-ps-grep': { prompt: 'Show only the lines of the process list that contain “nginx”.', hint: 'Send the output of ps to a filter.' },
  'w-kill-9': { prompt: 'Force process 4242 to stop immediately.', hint: 'kill with the SIGKILL signal.' },
  'w-nohup': {
    prompt: 'Run ./sauvegarde.sh in the background, so that it keeps going even after the terminal is closed.',
    hint: 'A command that ignores SIGHUP, and the character that runs in the background.',
  },

  // System
  'w-df-h': { prompt: 'Show the free space on each disk, in readable units.', hint: 'Disk free, human-readable.' },
  'w-du-sh': { prompt: 'Show the total size of the Documents directory, in readable units.', hint: 'Disk usage: total only (summarize) and readable.' },
  'w-free-h': { prompt: 'Show RAM usage in readable units.', hint: 'The opposite of “busy”.' },
  'w-which': { prompt: 'Print the path of the python3 program that will be run.', hint: '“Which one?”' },

  // Network
  'w-ping-c': { prompt: 'Send exactly 4 ping packets to google.com.', hint: 'A ping option sets the number of packets (count).' },
  'w-ssh-p': {
    prompt: 'Connect over SSH to the server serveur.fr, as the user admin, on port 2222.',
    hint: 'user@host, and the ssh port option (lowercase).',
  },
  'w-curl-o': {
    prompt: 'Download https://exemple.fr/doc.pdf, keeping its file name.',
    hint: 'wget does it by default; curl needs an option (capital O).',
  },
  'w-scp': {
    prompt: 'Send rapport.pdf to the /tmp directory of the server serveur.fr, as the user esprit.',
    hint: 'Like cp, but the destination is written user@host:path.',
  },

  // Archives
  'w-tar-c': {
    prompt: 'Create a gzip-compressed archive named projet.tar.gz containing the projet directory.',
    hint: 'tar: create, gzip, file (f last, followed by the archive name).',
  },
  'w-tar-x': { prompt: 'Extract the archive projet.tar.gz into the current directory.', hint: 'tar: extract, (gzip), file.' },
  'w-unzip-d': { prompt: 'Extract photos.zip into the vacances directory.', hint: 'unzip and its destination directory option.' },

  // Packages
  'w-apt-update': { prompt: 'Refresh the list of available packages (without installing anything).', hint: 'apt with sudo; it is not upgrade.' },
  'w-apt-install': { prompt: 'Install the htop package.', hint: 'sudo, apt, and the install subcommand.' },

  // Shell and misc
  'w-echo-redir': { prompt: 'Write “Bonjour” to the file salut.txt, replacing its contents.', hint: 'echo, and the redirection that overwrites.' },
  'w-echo-append': { prompt: 'Add the line “fin” to the end of journal.txt, without erasing what it contains.', hint: 'The appending redirection has two angle brackets.' },
  'w-echo-path': { prompt: 'Print the value of the PATH variable.', hint: 'A variable is read with $.' },
  'w-count-files': {
    prompt: 'Count the number of entries in the current directory (in one line, with a pipe).',
    hint: 'The list of files, sent to a line counter.',
  },
  'w-xargs': {
    prompt: 'Find every .tmp file under the current directory and delete them, passing the list to rm with xargs.',
    hint: 'find … | xargs rm',
  },
  'w-tee': {
    prompt: 'Run npm run build, showing the output on screen AND saving it to build.log.',
    hint: 'A command that makes a “T” in the pipe.',
  },
};

export const QUIZ_EN: Record<string, { question?: string; choices: string[]; explanation: string }> = {
  'q-rm-rf': {
    choices: [
      'Deletes /tmp/test and everything in it, without asking for confirmation',
      'Deletes /tmp/test only if it is empty',
      'Moves /tmp/test to the trash',
      'Asks for confirmation for each file in /tmp/test',
    ],
    explanation: '-r deletes the contents recursively, -f never asks for confirmation. There is no trash on the command line.',
  },
  'q-ls-lt': {
    choices: [
      'The 5 largest files',
      'The first 5 files in alphabetical order',
      'The most recently modified files (the 1st line is the total)',
      'The 5 oldest files',
    ],
    explanation: '-t sorts by modification date, newest first; head keeps the first 5 lines, including the “total” line.',
  },
  'q-grep-v': {
    choices: ['Shows only the comments', 'Shows the lines that do not start with #', 'Removes the comments from the file', 'Counts the lines starting with #'],
    explanation: '-v inverts the search and ^# means a # at the start of a line. The file itself is not changed.',
  },
  'q-chmod-640': {
    choices: [
      'Owner: read and write; group: read; others: nothing',
      'Owner: everything; group: read; others: nothing',
      'Everyone can read, only the owner can write',
      'Owner: read; group: write; others: nothing',
    ],
    explanation: '6 = 4+2 (rw-), 4 = r--, 0 = ---. Result: rw-r-----.',
  },
  'q-redirect-both': {
    choices: [
      'Only the errors go to build.log',
      'The output goes to build.log and the errors stay on screen',
      'The output and the errors both go to build.log',
      'The output is appended to the end of build.log',
    ],
    explanation: '> sends standard output to build.log, then 2>&1 sends errors to the same place as standard output.',
  },
  'q-and': {
    question: 'When does cd projet run?',
    choices: ['Always, after mkdir', 'Only if mkdir succeeded', 'Only if mkdir failed', 'At the same time as mkdir'],
    explanation: '&& runs the next command only if the previous one succeeded (exit code 0).',
  },
  'q-or': {
    question: 'When is the message “injoignable” (unreachable) shown?',
    choices: ['Always', 'If the ping succeeds', 'If the ping fails', 'Never: || is a double pipe'],
    explanation: '|| runs the next command only if the previous one fails.',
  },
  'q-tar-t': {
    choices: ['Extracts the archive', 'Tests that the archive is not corrupted', 'Lists the contents of the archive without extracting it', 'Creates an archive named sauvegarde.tar'],
    explanation: '-t (list) lists the contents; -f names the archive file.',
  },
  'q-kill': {
    question: 'Which signal is sent to process 1234?',
    choices: ['SIGKILL: immediate stop', 'SIGTERM: request to stop cleanly', 'SIGHUP: reload', 'None: kill only shows information'],
    explanation: 'Without an option, kill sends SIGTERM (15), which the program can catch to shut down cleanly.',
  },
  'q-find-empty': {
    choices: ['Deletes empty directories', 'Lists the empty directories under the current directory', 'Lists files of size 0', 'Counts the directories'],
    explanation: '-type d limits the search to directories, -empty keeps only the empty ones. Without -delete, find only prints.',
  },
  'q-du-sort': {
    choices: ['The 3 largest entries in the current directory', 'The free space on the first 3 disks', 'The 3 most recent files', 'The 3 smallest entries'],
    explanation: 'du -sh gives the size of each entry, sort -rh sorts them from largest to smallest while understanding units, head keeps the first 3.',
  },
  'q-sort-uniq': {
    choices: ['Removes duplicates from visites.log', 'Counts the number of occurrences of each line', 'Counts the total number of lines', 'Sorts the lines by frequency'],
    explanation: 'sort groups identical lines together, then uniq -c prints each line preceded by its number of occurrences (the result is not sorted by frequency).',
  },
  'q-nohup': {
    choices: [
      'Runs job.sh in the foreground and saves its output',
      'Runs job.sh in the background; it keeps going after the terminal is closed',
      'Schedules job.sh for later',
      'Runs job.sh with root privileges',
    ],
    explanation: 'nohup ignores the signal sent when the terminal closes, & runs in the background, and both output and errors go to job.log.',
  },
  'q-ssh-l': {
    choices: [
      'Makes port 80 of the server available on port 8080 of your machine',
      'Opens port 8080 of the server to the public',
      'Connects you to the server on port 8080',
      'Redirects all your web traffic to the server',
    ],
    explanation: '-L creates a local tunnel: localhost:8080 on your machine leads to port 80 as seen from the server.',
  },
  'q-sudo-tee': {
    question: 'Why use sudo tee rather than sudo echo … >> /etc/hosts?',
    choices: [
      'tee is faster than echo',
      'The >> redirection is done by your shell, without privileges: only tee, run with sudo, can write',
      'echo cannot write to a file',
      'There is no difference',
    ],
    explanation: 'In sudo echo … >> file, sudo only applies to echo; the file is opened by your shell, without root privileges.',
  },
  'q-apt-update': {
    choices: [
      'Installs updates for every package',
      'Updates apt itself',
      'Downloads the up-to-date list of available packages, without installing anything',
      'Updates the Linux kernel',
    ],
    explanation: 'update only refreshes the list of versions; apt upgrade is what installs the new versions.',
  },
};
