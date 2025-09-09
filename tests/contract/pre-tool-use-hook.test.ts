import { PreToolUseHook } from '../../src/hooks/morphApply.js';

describe('PreToolUseHook', () => {
  it('should be defined', () => {
    expect(PreToolUseHook).toBeDefined();
  });

  describe('onPreToolUse', () => {
    it.todo('should intercept a file edit tool call and return true on success');
    it.todo('should intercept a file edit tool call and return false on failure');
    it.todo('should not intercept non-file edit tool calls');
  });
});
