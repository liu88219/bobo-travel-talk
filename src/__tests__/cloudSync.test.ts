import { describe, it, expect } from 'vitest';
import {
  deriveVaultIdentity,
  encryptVaultPayload,
  decryptVaultPayload,
  getPasscodeFallbackVariants,
} from '../services/cryptoVault';
import {
  mergeVaultStates,
  buildTextDbFormBody,
} from '../services/cloudSync';
import {
  createInitialVaultState,
} from '../types/travel';
import {
  extractImportantKeywords,
  translateTextDualEngine,
} from '../services/translatorEngine';

describe('BoboTalk Cloud Sync & Translator Engine', () => {
  it('derives identical deterministic vault keys across Safari and Home Screen PWA', async () => {
    const id1 = await deriveVaultIdentity('mona-japan-2026');
    const id2 = await deriveVaultIdentity('  mona-japan-2026  ');
    expect(id1.vaultKey).toBe(id2.vaultKey);
    expect(id1.fingerprintBadge).toBe(id2.fingerprintBadge);
    expect(id1.vaultKey).toMatch(/^bobotalk_perm_v1_[0-9a-f]{32}$/);
  });

  it('generates iOS first-letter capitalization fallback variants', () => {
    const variants = getPasscodeFallbackVariants('MonaTrip88');
    expect(variants).toContain('MonaTrip88');
    expect(variants).toContain('monaTrip88');
    expect(variants).toContain('monatrip88');
  });

  it('encrypts and decrypts vault state losslessly using BC2 binary AES-GCM envelope', async () => {
    const state = createInitialVaultState();
    state.isUneditedDefault = false;
    state.updatedAt = 1700000000000;
    state.profile.geminiApiKey = 'AIzaSyTestEncryptedInVaultOnly';
    const raw = JSON.stringify(state);
    const cipher = await encryptVaultPayload(raw, 'test-pass-123');
    expect(cipher.startsWith('BC2:')).toBe(true);
    const plain = await decryptVaultPayload(cipher, 'test-pass-123');
    expect(JSON.parse(plain).profile.geminiApiKey).toBe('AIzaSyTestEncryptedInVaultOnly');
  });

  it('encodes + signs safely via URLSearchParams for textdb.online form body', () => {
    const body = buildTextDbFormBody('bobotalk_perm_v1_abc', 'BC2:abc+def/123==');
    expect(body).toContain('BC2%3Aabc%2Bdef%2F123%3D%3D');
  });

  it('protects cloud records from being overwritten by unedited default state and respects tombstones', () => {
    const freshDefault = createInitialVaultState();
    const remoteEdited = createInitialVaultState();
    remoteEdited.isUneditedDefault = false;
    remoteEdited.updatedAt = 5000;
    remoteEdited.dialogues = [
      {
        id: 'turn-1',
        speaker: 'me',
        targetLang: 'ja',
        sourceText: '請給我兩份',
        translatedText: '2つください',
        engine: 'builtin',
        createdAt: 4000,
        updatedAt: 4000,
      },
    ];

    const merged1 = mergeVaultStates(freshDefault, remoteEdited);
    expect(merged1.isUneditedDefault).toBe(false);
    expect(merged1.dialogues).toHaveLength(1);

    // Tombstone deletion check
    const localWithDelete = {
      ...merged1,
      updatedAt: 6000,
      dialogues: [],
      deletedIds: { 'turn-1': 5500 },
    };
    const merged2 = mergeVaultStates(localWithDelete, remoteEdited);
    expect(merged2.dialogues).toHaveLength(0);
    expect(merged2.deletedIds['turn-1']).toBe(5500);
  });

  it('extracts prices, gate numbers, and platforms from broadcast text', () => {
    const kws = extractImportantKeywords(
      'Gate B14 boarding at 14:30, total ¥5,800 on 3番線'
    );
    expect(kws.length).toBeGreaterThanOrEqual(3);
  });

  it('matches offline survival phrases with Taiwanese phonetic hint', async () => {
    const res = await translateTextDualEngine({
      text: '不好意思，我們有兩位，請問現在有位子嗎？',
      direction: 'zh-to-foreign',
      targetLang: 'ja',
    });
    expect(res.translatedText).toContain('2人');
    expect(res.phoneticHint).toContain('斯咪媽線');
  });
});
