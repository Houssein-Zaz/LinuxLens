import { act, render, screen } from '@testing-library/react';
import { useCaptcha } from '../Captcha';

/** Faux Turnstile : garde les options du dernier widget pour simuler la réussite ou l'expiration. */
function fakeTurnstile() {
  let options: { sitekey: string; callback(token: string): void; 'expired-callback'(): void } | undefined;
  const turnstile = {
    render: vi.fn((_el: HTMLElement, o: typeof options) => {
      options = o;
      return 'widget-1';
    }),
    reset: vi.fn(),
    remove: vi.fn(),
  };
  window.turnstile = turnstile as unknown as Window['turnstile'];
  return { turnstile, options: () => options! };
}

function Form({ siteKey }: { siteKey?: string }) {
  const captcha = useCaptcha(siteKey);
  return (
    <form>
      {captcha.element}
      <output data-testid="token">{captcha.token ?? ''}</output>
      <button type="button" disabled={!captcha.ready}>
        Envoyer
      </button>
      <button type="button" onClick={captcha.reset}>
        Réinitialiser
      </button>
    </form>
  );
}

afterEach(() => {
  delete window.turnstile;
});

describe('useCaptcha', () => {
  it('sans clé de site : rien à afficher, formulaire utilisable', () => {
    render(<Form />);
    expect(screen.queryByTestId('captcha')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeEnabled();
  });

  it('avec clé : envoi bloqué jusqu’à la vérification, puis de nouveau après expiration', async () => {
    const { turnstile, options } = fakeTurnstile();
    render(<Form siteKey="cle-de-site" />);
    const send = screen.getByRole('button', { name: 'Envoyer' });
    expect(send).toBeDisabled();

    await vi.waitFor(() => expect(turnstile.render).toHaveBeenCalled());
    expect(options()).toMatchObject({ sitekey: 'cle-de-site', language: 'fr' });

    act(() => options().callback('jeton-123'));
    expect(send).toBeEnabled();
    expect(screen.getByTestId('token')).toHaveTextContent('jeton-123');

    act(() => options()['expired-callback']());
    expect(send).toBeDisabled();
  });

  it('reset : jeton oublié et widget relancé (un jeton ne sert qu’une fois)', async () => {
    const { turnstile, options } = fakeTurnstile();
    render(<Form siteKey="cle-de-site" />);
    await vi.waitFor(() => expect(turnstile.render).toHaveBeenCalled());
    act(() => options().callback('jeton-123'));

    act(() => screen.getByRole('button', { name: 'Réinitialiser' }).click());
    expect(turnstile.reset).toHaveBeenCalledWith('widget-1');
    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled();
  });

  it('retire le widget quand le formulaire disparaît', async () => {
    const { turnstile } = fakeTurnstile();
    const { unmount } = render(<Form siteKey="cle-de-site" />);
    await vi.waitFor(() => expect(turnstile.render).toHaveBeenCalled());
    unmount();
    expect(turnstile.remove).toHaveBeenCalledWith('widget-1');
  });
});
