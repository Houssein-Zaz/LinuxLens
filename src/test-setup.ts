import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

// Les pages sont chargées à la demande : la première compilation d'une page peut dépasser 1 s
configure({ asyncUtilTimeout: 5000 });
