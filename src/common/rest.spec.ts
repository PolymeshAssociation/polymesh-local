import { validateMnemonics } from './rest';

describe('validateMnemonics', () => {
  const fakeDid = '0x123';
  const validMnemonic = 'apple banana cherry dog egress fog good hat igloo jug llama nope';

  it('should allow for 12 words', () => {
    const result = validateMnemonics(validMnemonic, fakeDid);
    expect(result).toEqual(true);
  });

  it('should allow for shorthand', () => {
    const input = '//Alice';
    const result = validateMnemonics(input, fakeDid);
    expect(result).toEqual(true);
  });

  it('should fail if the mnemonic is less than 12 words', () => {
    const input = 'one two three';
    const result = validateMnemonics(input, fakeDid);
    expect(result).toEqual(
      'Mnemonics should be 12 words separated by spaces or a shorthand like //Alice. "one two three" did not meet this rule'
    );
  });

  it('should fail if the mnemonic is more than 12 words', () => {
    const input = `${validMnemonic} extra words`;
    const result = validateMnemonics(input, fakeDid);
    expect(result).toEqual(
      'Mnemonics should be 12 words separated by spaces or a shorthand like //Alice. "apple banana cherry dog egress fog good hat igloo jug llama nope extra words" did not meet this rule'
    );
  });

  it('should ensure each mnemonic has an associated DID', () => {
    const dids = `${fakeDid}, ${fakeDid}`;
    const result = validateMnemonics(validMnemonic, dids);
    expect(result).toEqual(
      'Each DID requires a mnemonic to be passed. Received 1 mnemonics for 2 DIDs'
    );
  });

  it('should allow a comma separated list', () => {
    const input = `${validMnemonic}, //Alice, ${validMnemonic}`;
    const dids = `${fakeDid}, ${fakeDid}, ${fakeDid}`;
    const result = validateMnemonics(input, dids);
    expect(result).toEqual(true);
  });

  it('should fail with an invalid entry in a list', () => {
    const input = `${validMnemonic},not enough`;
    const dids = `${fakeDid},${fakeDid}`;
    const result = validateMnemonics(input, dids);
    expect(result).toEqual(
      'Mnemonics should be 12 words separated by spaces or a shorthand like //Alice. "not enough" did not meet this rule'
    );
  });
});
