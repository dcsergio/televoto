import { describe, expect, it } from 'vitest';
import { splitEventNameForDisplay } from './event-name-display.util';

describe('splitEventNameForDisplay', () => {
  it('splits on the // delimiter into prefix and emphasized parts', () => {
    expect(splitEventNameForDisplay('Finale regionale // GRAN FINALE')).toEqual({
      prefix: 'Finale regionale',
      emphasized: 'GRAN FINALE',
    });
  });

  it('falls back to the legacy *** delimiter when // is absent', () => {
    expect(splitEventNameForDisplay('Evento *** Edizione 2026')).toEqual({
      prefix: 'Evento',
      emphasized: 'Edizione 2026',
    });
  });

  it('treats a name with no delimiter as fully emphasized', () => {
    expect(splitEventNameForDisplay('Festival della Canzone')).toEqual({
      prefix: '',
      emphasized: 'Festival della Canzone',
    });
  });

  it('returns empty strings for blank input', () => {
    expect(splitEventNameForDisplay('   ')).toEqual({ prefix: '', emphasized: '' });
  });
});
