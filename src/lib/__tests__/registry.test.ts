import { findOption, getCommand, registrySpec, suggestCommands } from '../registry';
import { parseCommandLine } from '../parser';

describe('registry', () => {
  it('retrouve une fiche et ses options', () => {
    const ls = getCommand('ls');
    expect(ls?.category).toBe('files');
    expect(findOption(ls!, '-a')?.long).toBe('--all');
    expect(findOption(ls!, '--all')?.short).toBe('-a');
  });

  it('fournit takesValue au parseur à partir des fiches', () => {
    const { segments } = parseCommandLine('grep -A 3 motif f', registrySpec);
    expect(segments[0]?.tokens.map((t) => t.kind)).toEqual(['command', 'option', 'option-value', 'argument', 'argument']);
    expect(registrySpec.takesValue?.('inconnue', '-x')).toBeUndefined();
  });

  it('suggère les préfixes avant les correspondances internes', () => {
    const s = suggestCommands('c');
    expect(s.slice(0, 5).every((n) => n.startsWith('c'))).toBe(true);
    expect(suggestCommands('rep')).toContain('grep');
    expect(suggestCommands('')).toEqual([]);
  });

  it('intègre des noms supplémentaires, fiches détaillées en premier', () => {
    expect(suggestCommands('ta', ['tac'])).toEqual(['tar', 'tail', 'tac']);
  });
});
