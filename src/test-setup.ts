import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import { setCurrentLang } from './i18n';

// Les pages sont chargées à la demande : la première compilation d'une page peut dépasser 1 s
configure({ asyncUtilTimeout: 5000 });

// Le site est en français par défaut : les tests aussi (jsdom annonce un navigateur en anglais)
Object.defineProperty(window.navigator, 'languages', { value: ['fr-FR', 'fr'], configurable: true });
Object.defineProperty(window.navigator, 'language', { value: 'fr-FR', configurable: true });

// La langue choisie dans un test ne doit pas déborder sur le suivant
afterEach(() => {
  setCurrentLang('fr');
  try {
    localStorage.removeItem('linuxlens-lang');
  } catch {
    // stockage indisponible
  }
});
