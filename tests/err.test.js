const { errMsg, errStack } = require('../src/lib/err');

describe('errMsg', () => {
  test('Error → .message', () => {
    expect(errMsg(new Error('boom'))).toBe('boom');
  });

  test('subclass of Error → .message', () => {
    class MyError extends Error {}
    expect(errMsg(new MyError('subclass'))).toBe('subclass');
  });

  test('string → itself', () => {
    expect(errMsg('plain string')).toBe('plain string');
  });

  test('number → stringified', () => {
    expect(errMsg(42)).toBe('42');
  });

  test('null → "null"', () => {
    expect(errMsg(null)).toBe('null');
  });

  test('undefined → "undefined"', () => {
    expect(errMsg(undefined)).toBe('undefined');
  });

  test('plain object → JSON.stringify (not [object Object])', () => {
    expect(errMsg({ code: 'E_FAIL', detail: 'x' })).toBe('{"code":"E_FAIL","detail":"x"}');
  });

  test('circular object → falls back to String() without throwing', () => {
    const obj = { name: 'circ' };
    obj.self = obj;
    expect(errMsg(obj)).toBe('[object Object]');
  });
});

describe('errStack', () => {
  test('Error → .stack', () => {
    const e = new Error('with-stack');
    expect(errStack(e)).toContain('with-stack');
  });

  test('non-Error → undefined', () => {
    expect(errStack('string')).toBeUndefined();
    expect(errStack(null)).toBeUndefined();
    expect(errStack({ code: 1 })).toBeUndefined();
  });
});
