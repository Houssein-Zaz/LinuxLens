import { installErrorReporting, reportError, resetErrorReporting } from '../errorReporting';

const monitor = () => ({ report: vi.fn(async () => {}) });

beforeEach(() => resetErrorReporting());

describe('reportError', () => {
  it('envoie le message et la pile d’appels', () => {
    const m = monitor();
    reportError('page', new TypeError('x is undefined'), m);
    expect(m.report).toHaveBeenCalledWith({ source: 'page', message: 'TypeError: x is undefined', detail: expect.stringContaining('TypeError') });
  });

  it('chaque erreur une seule fois, 20 au plus par visite', () => {
    const m = monitor();
    reportError('page', new Error('même'), m);
    reportError('page', new Error('même'), m);
    expect(m.report).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 30; i++) reportError('window', new Error(`n°${i}`), m);
    expect(m.report).toHaveBeenCalledTimes(20);
  });

  it('ignore le bruit des scripts tiers et du navigateur', () => {
    const m = monitor();
    reportError('window', 'Script error.', m);
    reportError('window', new Error('ResizeObserver loop completed with undelivered notifications.'), m);
    expect(m.report).not.toHaveBeenCalled();
  });
});

describe('installErrorReporting', () => {
  it('signale les erreurs et promesses rejetées non rattrapées, puis se retire', () => {
    const m = monitor();
    const uninstall = installErrorReporting(m);
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('boum'), message: 'boum' }));
    const rejection = new Event('unhandledrejection') as PromiseRejectionEvent;
    Object.defineProperty(rejection, 'reason', { value: new Error('refusée') });
    window.dispatchEvent(rejection);
    expect(m.report).toHaveBeenCalledWith(expect.objectContaining({ source: 'window', message: 'Error: boum' }));
    expect(m.report).toHaveBeenCalledWith(expect.objectContaining({ source: 'promise', message: 'Error: refusée' }));

    uninstall();
    // Empêche jsdom d'afficher l'erreur volontaire dans la console des tests
    const silence = (e: Event) => e.preventDefault();
    window.addEventListener('error', silence);
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('après'), cancelable: true }));
    window.removeEventListener('error', silence);
    expect(m.report).toHaveBeenCalledTimes(2);
  });
});
