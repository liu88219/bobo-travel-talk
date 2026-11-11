import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Mic,
  Volume2,
  RefreshCw,
  Star,
  Trash2,
  Maximize2,
  Sparkles,
  Camera,
  BookOpen,
  Calculator,
  Radio,
  Settings,
  Eye,
  EyeOff,
  Plus,
  Minus,
  Download,
  Upload,
  ShieldCheck,
  FlipVertical2,
  Languages,
  Send,
  X,
  History,
  Copy,
  CheckCircle2,
  Edit3,
  Crop,
  FileText,
} from 'lucide-react';
import {
  VaultState,
  LanguageCode,
  TranslationTone,
  PhraseCategory,
  DialogueTurn,
  LiveSubtitleSegment,
  MenuScanSession,
  CustomPhraseCard,
  ShoppingCalcItem,
} from './types/travel';
import {
  LANGUAGES,
  LANGUAGE_LIST,
  PHRASE_CATEGORIES,
  DIETARY_ORDER_NOTES,
  BUILTIN_SURVIVAL_PHRASES,
  DEMO_MENU_SESSIONS,
  buildSeedCustomPhrases,
} from './data/languages';
import {
  requestPersistentStorage,
  loadLocalVaultSync,
  loadLocalVaultState,
  saveLocalVaultState,
  loadRememberedPasscodeSync,
  loadRememberedPasscode,
  saveRememberedPasscode,
  syncVaultWithCloud,
  pushVaultToCloud,
  subscribeToVaultSse,
  listLocalHistorySnapshots,
  LocalHistorySnapshot,
  exportVaultBackupJson,
  importVaultBackupJson,
  parseVaultJson,
  mergeVaultStates,
} from './services/cloudSync';
import {
  deriveVaultIdentity,
  normalizePasscode,
} from './services/cryptoVault';
import {
  translateTextDualEngine,
  transcribeAndTranslateAudioWithGemini,
  analyzeMenuPhotoWithGemini,
  analyzeMenuPhotoFreeOcr,
  cropImageDataUrl,
  parseAndTranslateMenuLinesFree,
  speakTextTTS,
  fetchLiveExchangeRatesToTwd,
  compressImageFileToDataUrl,
} from './services/translatorEngine';
import {
  HeroTravelBanner,
  QuokkaBoboTravelBadge,
} from './components/QuokkaBoboArt';

type ActiveTab = 'talk' | 'live' | 'menu' | 'phrasebook' | 'calc';

interface JumboShowCardData {
  titleZh: string;
  foreignText: string;
  romanization?: string;
  phoneticHint?: string;
  backTranslatedText?: string;
  lang: LanguageCode;
  flipped?: boolean;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export default function App() {
  const [vault, setVault] = useState<VaultState>(() => loadLocalVaultSync());
  const [passcode, setPasscode] = useState<string>(() => loadRememberedPasscodeSync());
  const [passcodeInput, setPasscodeInput] = useState<string>(() => loadRememberedPasscodeSync());
  const [showPasscodePlain, setShowPasscodePlain] = useState(false);
  const [showGeminiKeyPlain, setShowGeminiKeyPlain] = useState(false);
  const [fingerprintBadge, setFingerprintBadge] = useState<string>('');
  const [sseTopic, setSseTopic] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'pending'>('idle');
  const [toastMsg, setToastMsg] = useState<string>('');

  const [activeTab, setActiveTab] = useState<ActiveTab>('talk');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [jumboCard, setJumboCard] = useState<JumboShowCardData | null>(null);
  const [showOrderCardModal, setShowOrderCardModal] = useState(false);

  // Tab 1: Face-to-Face Dual Talk state
  const [inputText, setInputText] = useState('');
  const [inputDirection, setInputDirection] = useState<'zh-to-foreign' | 'foreign-to-zh'>('zh-to-foreign');
  const [isTranslating, setIsTranslating] = useState(false);
  const [recordingSide, setRecordingSide] = useState<'me' | 'partner' | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [editingTurnId, setEditingTurnId] = useState<string | null>(null);
  const [editingTurnText, setEditingTurnText] = useState<string>('');

  // Tab 2: Live Stream Subtitle state
  const [isLiveListening, setIsLiveListening] = useState(false);
  const [liveInterimText, setLiveInterimText] = useState('');
  const [liveManualInput, setLiveManualInput] = useState('');

  // Tab 3: Menu Photo & Point-to-Order Card state
  const [activeMenuId, setActiveMenuId] = useState<string>('');
  const [isAnalyzingMenu, setIsAnalyzingMenu] = useState(false);
  const [ocrStatusText, setOcrStatusText] = useState<string>('');
  const [ocrProgressPct, setOcrProgressPct] = useState<number>(0);
  const [menuOrientation, setMenuOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [freeMenuPasteText, setFreeMenuPasteText] = useState('');
  const [showFreeMenuInput, setShowFreeMenuInput] = useState(false);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [editingDishOrig, setEditingDishOrig] = useState('');
  const [editingDishZh, setEditingDishZh] = useState('');
  const [editingDishPrice, setEditingDishPrice] = useState('');

  // Tab 4: Offline Phrasebook state
  const [selectedCategory, setSelectedCategory] = useState<PhraseCategory>('dining');
  const [phraseSearch, setPhraseSearch] = useState('');
  const [newCustomZh, setNewCustomZh] = useState('');
  const [newCustomForeign, setNewCustomForeign] = useState('');
  const [newCustomPhonetic, setNewCustomPhonetic] = useState('');
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);

  // Tab 5: Voice Currency & Tax-Free Calculator state
  const [calcAmountStr, setCalcAmountStr] = useState('5800');
  const [calcItemTitle, setCalcItemTitle] = useState('');
  const [isUpdatingRates, setIsUpdatingRates] = useState(false);
  const [isListeningPrice, setIsListeningPrice] = useState(false);

  // Settings / History Snapshots
  const [historySnapshots, setHistorySnapshots] = useState<LocalHistorySnapshot[]>([]);

  const vaultRef = useRef(vault);
  vaultRef.current = vault;
  const passcodeRef = useRef(passcode);
  passcodeRef.current = passcode;

  const speechRecRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const liveRecRef = useRef<SpeechRecognitionInstance | null>(null);
  const isLiveListeningRef = useRef(false);

  const activeLang: LanguageCode = vault.profile.activeLang || 'ja';
  const langCfg = LANGUAGES[activeLang] || LANGUAGES.ja;
  const activeRateToTwd =
    vault.profile.customRatesToTwd?.[activeLang] || langCfg.defaultRateToTwd;

  const notify = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(''), 3800);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // Derived cloud identity badge
  useEffect(() => {
    const clean = normalizePasscode(passcode);
    if (!clean) {
      setFingerprintBadge('');
      setSseTopic('');
      return;
    }
    let cancelled = false;
    deriveVaultIdentity(clean)
      .then((id) => {
        if (!cancelled) {
          setFingerprintBadge(id.fingerprintBadge);
          setSseTopic(id.sseTopic);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [passcode]);

  // Persist & push helper
  const commitVaultUpdate = useCallback(
    async (updater: (prev: VaultState) => VaultState) => {
      const next = updater(vaultRef.current);
      vaultRef.current = next;
      setVault(next);
      await saveLocalVaultState(next);

      const cleanPass = normalizePasscode(passcodeRef.current);
      if (cleanPass) {
        setSyncStatus('syncing');
        const ok = await pushVaultToCloud(next, cleanPass);
        setSyncStatus(ok ? 'synced' : 'pending');
      }
    },
    []
  );

  // Startup hydration from IndexedDB & Cloud
  useEffect(() => {
    let mounted = true;
    (async () => {
      await requestPersistentStorage();
      const [hydratedState, savedPass] = await Promise.all([
        loadLocalVaultState(),
        loadRememberedPasscode(),
      ]);
      if (!mounted) return;
      vaultRef.current = hydratedState;
      setVault(hydratedState);

      if (savedPass) {
        passcodeRef.current = savedPass;
        setPasscode(savedPass);
        setPasscodeInput(savedPass);
        setSyncStatus('syncing');
        const { merged, synced, matchedPasscode } = await syncVaultWithCloud(
          hydratedState,
          savedPass
        );
        if (!mounted) return;
        vaultRef.current = merged;
        setVault(merged);
        if (matchedPasscode && matchedPasscode !== savedPass) {
          passcodeRef.current = matchedPasscode;
          setPasscode(matchedPasscode);
          setPasscodeInput(matchedPasscode);
          await saveRememberedPasscode(matchedPasscode);
        }
        setSyncStatus(synced ? 'synced' : 'pending');
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Auto sync on window focus / visibilitychange / online recovery
  const handleManualOrAutoSync = useCallback(
    async (showNotification = false) => {
      const cleanPass = normalizePasscode(passcodeRef.current);
      if (!cleanPass) {
        if (showNotification) {
          setShowSettingsModal(true);
          notify('請先設定或輸入「雲端同步通行碼」即可跨 Safari 與主畫面 App 同步！');
        }
        return;
      }
      setSyncStatus('syncing');
      const { merged, synced, matchedPasscode } = await syncVaultWithCloud(
        vaultRef.current,
        cleanPass
      );
      vaultRef.current = merged;
      setVault(merged);
      if (matchedPasscode && matchedPasscode !== cleanPass) {
        passcodeRef.current = matchedPasscode;
        setPasscode(matchedPasscode);
        setPasscodeInput(matchedPasscode);
        await saveRememberedPasscode(matchedPasscode);
      }
      setSyncStatus(synced ? 'synced' : 'pending');
      if (showNotification) {
        notify(
          synced
            ? '☁️ 已完成跨裝置雲端同步（Safari ↔ 主畫面 App 已對齊最新紀錄）'
            : '⚠️ 目前離線或雲端忙碌，資料已安全存入本機保險箱（待連網自動同步）'
        );
      }
    },
    [notify]
  );

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && passcodeRef.current) {
        void handleManualOrAutoSync(false);
      }
    };
    const onFocus = () => {
      if (passcodeRef.current) {
        void handleManualOrAutoSync(false);
      }
    };
    const onOnline = () => {
      if (passcodeRef.current) {
        void handleManualOrAutoSync(false);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
    };
  }, [handleManualOrAutoSync]);

  // Real-time SSE listener
  useEffect(() => {
    if (!sseTopic || !passcode) return;
    return subscribeToVaultSse(sseTopic, () => {
      void handleManualOrAutoSync(false);
    });
  }, [sseTopic, passcode, handleManualOrAutoSync]);

  // Set activeLang helper
  const handleSelectLanguage = (code: LanguageCode) => {
    void commitVaultUpdate((prev) => ({
      ...prev,
      isUneditedDefault: false,
      updatedAt: Date.now(),
      settingsUpdatedAt: Date.now(),
      profile: {
        ...prev.profile,
        activeLang: code,
      },
    }));
  };

  // Set translation tone
  const handleSelectTone = (tone: TranslationTone) => {
    void commitVaultUpdate((prev) => ({
      ...prev,
      isUneditedDefault: false,
      updatedAt: Date.now(),
      settingsUpdatedAt: Date.now(),
      profile: {
        ...prev.profile,
        preferredTone: tone,
      },
    }));
  };

  // Toggle 180° Face-to-Face Flip
  const handleToggleFlip = () => {
    void commitVaultUpdate((prev) => ({
      ...prev,
      isUneditedDefault: false,
      updatedAt: Date.now(),
      settingsUpdatedAt: Date.now(),
      profile: {
        ...prev.profile,
        faceToFaceFlipped: !prev.profile.faceToFaceFlipped,
      },
    }));
  };

  // Toggle confirmTranscriptBeforeSend
  const handleToggleConfirmBeforeSend = () => {
    void commitVaultUpdate((prev) => ({
      ...prev,
      isUneditedDefault: false,
      updatedAt: Date.now(),
      settingsUpdatedAt: Date.now(),
      profile: {
        ...prev.profile,
        confirmTranscriptBeforeSend: !prev.profile.confirmTranscriptBeforeSend,
      },
    }));
  };

  // Execute Translation and append (or update existing turn) in Dialogue History
  const executeDialogueTranslation = useCallback(
    async (
      rawText: string,
      speaker: 'me' | 'partner',
      overrideLang?: LanguageCode,
      replaceTurnId?: string
    ) => {
      const clean = rawText.trim();
      if (!clean) return;
      const targetLang = overrideLang || vaultRef.current.profile.activeLang || 'ja';
      const direction = speaker === 'me' ? 'zh-to-foreign' : 'foreign-to-zh';
      setIsTranslating(true);
      try {
        const res = await translateTextDualEngine({
          text: clean,
          direction,
          targetLang,
          tone: vaultRef.current.profile.preferredTone,
          geminiApiKey: vaultRef.current.profile.geminiApiKey,
          geminiModel: vaultRef.current.profile.geminiModel,
        });

        const now = Date.now();
        const turn: DialogueTurn = {
          id: replaceTurnId || `turn-${now}-${Math.random().toString(36).slice(2, 6)}`,
          speaker,
          targetLang,
          sourceText: res.sourceText,
          translatedText: res.translatedText,
          romanization: res.romanization,
          phoneticHint: res.phoneticHint,
          culturalTip: res.culturalTip,
          backTranslatedText: res.backTranslatedText,
          confidenceScore: res.confidenceScore,
          wordBreakdowns: res.wordBreakdowns,
          alternativeText: res.alternativeText,
          engine: res.engine,
          starred: false,
          createdAt: now,
          updatedAt: now,
        };

        await commitVaultUpdate((prev) => ({
          ...prev,
          isUneditedDefault: false,
          updatedAt: now,
          dialogues: replaceTurnId
            ? prev.dialogues.map((d) => (d.id === replaceTurnId ? { ...turn, starred: d.starred } : d))
            : [turn, ...prev.dialogues].slice(0, 120),
        }));

        if (vaultRef.current.profile.autoSpeakTranslation) {
          const speakBcp47 =
            speaker === 'me' ? LANGUAGES[targetLang].bcp47 : 'zh-TW';
          speakTextTTS(
            res.translatedText,
            speakBcp47,
            vaultRef.current.profile.speechRate || 0.95
          );
        }
      } catch (err) {
        notify(err instanceof Error ? err.message : '翻譯發生錯誤，請稍後再試');
      } finally {
        setIsTranslating(false);
      }
    },
    [commitVaultUpdate, notify]
  );

  // Stop active voice recording
  const stopVoiceCapture = useCallback(() => {
    try {
      speechRecRef.current?.stop();
    } catch {
      // ignore
    }
    speechRecRef.current = null;

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    setRecordingSide(null);
  }, []);

  // Start Voice Recording (Web Speech API + Simultaneous MediaRecorder fallback for Gemini Multimodal Audio)
  const startVoiceCapture = useCallback(
    async (side: 'me' | 'partner') => {
      if (recordingSide === side) {
        stopVoiceCapture();
        return;
      }
      stopVoiceCapture();
      setRecordingSide(side);
      setInterimTranscript('');
      setInputDirection(side === 'me' ? 'zh-to-foreign' : 'foreign-to-zh');

      const recogLang = side === 'me' ? 'zh-TW' : langCfg.bcp47;
      let capturedViaSpeechApi = false;
      let latestTranscript = '';

      const SpeechCtor = getSpeechRecognitionCtor();
      if (SpeechCtor) {
        try {
          const rec = new SpeechCtor();
          rec.lang = recogLang;
          rec.continuous = false;
          rec.interimResults = true;
          rec.onresult = (event: unknown) => {
            const e = event as {
              results?: ArrayLike<ArrayLike<{ transcript?: string }>>;
            };
            if (!e.results) return;
            let text = '';
            for (let i = 0; i < e.results.length; i++) {
              text += e.results[i][0]?.transcript || '';
            }
            if (text.trim()) {
              latestTranscript = text.trim();
              setInterimTranscript(latestTranscript);
            }
          };
          rec.onerror = () => {};
          rec.onend = () => {
            setRecordingSide((curr) => (curr === side ? null : curr));
            if (latestTranscript.trim()) {
              capturedViaSpeechApi = true;
              setInterimTranscript('');
              if (vaultRef.current.profile.confirmTranscriptBeforeSend) {
                setInputText(latestTranscript.trim());
                setInputDirection(side === 'me' ? 'zh-to-foreign' : 'foreign-to-zh');
                notify('🎙️ 已完成語音聽寫！請在輸入框確認文字無誤後點「翻譯」送出');
              } else {
                void executeDialogueTranslation(latestTranscript.trim(), side);
              }
            }
          };
          speechRecRef.current = rec;
          rec.start();
        } catch {
          // Fallback to MediaRecorder or manual prompt
        }
      }

      const hasGeminiKey = Boolean(
        vaultRef.current.profile.geminiApiKey &&
          vaultRef.current.profile.geminiApiKey.trim().length > 10
      );
      if (
        (hasGeminiKey || !SpeechCtor) &&
        typeof navigator !== 'undefined' &&
        navigator.mediaDevices?.getUserMedia
      ) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mimeType =
            typeof MediaRecorder !== 'undefined' &&
            MediaRecorder.isTypeSupported('audio/webm')
              ? 'audio/webm'
              : 'audio/mp4';
          const mr = new MediaRecorder(stream);
          audioChunksRef.current = [];
          mr.ondataavailable = (ev) => {
            if (ev.data && ev.data.size > 0) {
              audioChunksRef.current.push(ev.data);
            }
          };
          mr.onstop = async () => {
            stream.getTracks().forEach((t) => t.stop());
            if (capturedViaSpeechApi || latestTranscript.trim()) return;
            const blob = new Blob(audioChunksRef.current, { type: mimeType });
            if (blob.size < 400) return;

            if (hasGeminiKey) {
              setIsTranslating(true);
              try {
                const reader = new FileReader();
                const b64: string = await new Promise((resolve) => {
                  reader.onloadend = () => {
                    const res = String(reader.result || '');
                    resolve(res.includes(',') ? res.split(',')[1] : '');
                  };
                  reader.readAsDataURL(blob);
                });
                const gemRes = await transcribeAndTranslateAudioWithGemini({
                  audioBase64: b64,
                  mimeType,
                  direction: side === 'me' ? 'zh-to-foreign' : 'foreign-to-zh',
                  targetLang: vaultRef.current.profile.activeLang,
                  tone: vaultRef.current.profile.preferredTone,
                  geminiApiKey: vaultRef.current.profile.geminiApiKey || '',
                  geminiModel: vaultRef.current.profile.geminiModel,
                });
                if (gemRes) {
                  const now = Date.now();
                  const turn: DialogueTurn = {
                    id: `turn-${now}`,
                    speaker: side,
                    targetLang: vaultRef.current.profile.activeLang,
                    sourceText: gemRes.sourceText,
                    translatedText: gemRes.translatedText,
                    romanization: gemRes.romanization,
                    phoneticHint: gemRes.phoneticHint,
                    culturalTip: gemRes.culturalTip,
                    backTranslatedText: gemRes.backTranslatedText,
                    confidenceScore: gemRes.confidenceScore,
                    wordBreakdowns: gemRes.wordBreakdowns,
                    engine: 'gemini',
                    createdAt: now,
                    updatedAt: now,
                  };
                  await commitVaultUpdate((prev) => ({
                    ...prev,
                    isUneditedDefault: false,
                    updatedAt: now,
                    dialogues: [turn, ...prev.dialogues],
                  }));
                  if (vaultRef.current.profile.autoSpeakTranslation) {
                    const speakBcp47 =
                      side === 'me'
                        ? LANGUAGES[vaultRef.current.profile.activeLang].bcp47
                        : 'zh-TW';
                    speakTextTTS(gemRes.translatedText, speakBcp47);
                  }
                }
              } finally {
                setIsTranslating(false);
              }
            }
          };
          mediaRecorderRef.current = mr;
          mr.start();
        } catch {
          if (!SpeechCtor) {
            setRecordingSide(null);
            notify('請允許麥克風權限，或直接點選下方常用語音範例／輸入文字翻譯！');
          }
        }
      } else if (!SpeechCtor) {
        setRecordingSide(null);
        notify('此瀏覽器不支援直接語音辨識，請使用 Safari / Chrome 或於設定綁定 Gemini Key！');
      }
    },
    [
      recordingSide,
      stopVoiceCapture,
      langCfg.bcp47,
      executeDialogueTranslation,
      commitVaultUpdate,
      notify,
    ]
  );

  // Star / bookmark a dialogue turn into Custom Phrasebook
  const handleToggleStarTurn = async (turn: DialogueTurn) => {
    const now = Date.now();
    const nextStarred = !turn.starred;
    const zhText =
      turn.speaker === 'me' ? turn.sourceText : turn.translatedText;
    const foreignText =
      turn.speaker === 'me' ? turn.translatedText : turn.sourceText;

    await commitVaultUpdate((prev) => {
      const dialogues = prev.dialogues.map((d) =>
        d.id === turn.id ? { ...d, starred: nextStarred, updatedAt: now } : d
      );
      let customPhrases = [...prev.customPhrases];
      const phraseId = `starred-${turn.id}`;
      const deletedIds = { ...prev.deletedIds };

      if (nextStarred) {
        delete deletedIds[phraseId];
        const card: CustomPhraseCard = {
          id: phraseId,
          category: 'custom',
          lang: turn.targetLang,
          zhText,
          foreignText,
          romanization: turn.romanization,
          phoneticHint: turn.phoneticHint,
          note: '⭐ 從即時語音對話收藏',
          pinned: true,
          createdAt: now,
          updatedAt: now,
        };
        customPhrases = [card, ...customPhrases.filter((c) => c.id !== phraseId)];
      } else {
        deletedIds[phraseId] = now;
        customPhrases = customPhrases.filter((c) => c.id !== phraseId);
      }
      return {
        ...prev,
        isUneditedDefault: false,
        updatedAt: now,
        dialogues,
        customPhrases,
        deletedIds,
      };
    });
    notify(nextStarred ? '⭐ 已收藏至「離線手指卡 ➜ 我的專屬小卡」！' : '已取消收藏');
  };

  // Delete dialogue turn with Tombstone
  const handleDeleteTurn = async (turnId: string) => {
    const now = Date.now();
    await commitVaultUpdate((prev) => ({
      ...prev,
      isUneditedDefault: false,
      updatedAt: now,
      dialogues: prev.dialogues.filter((d) => d.id !== turnId),
      deletedIds: {
        ...prev.deletedIds,
        [turnId]: now,
      },
    }));
  };

  // Tab 2: Continuous Live Stream Subtitle Listener
  const appendLiveSegment = useCallback(
    async (foreignSpeech: string) => {
      const clean = foreignSpeech.trim();
      if (!clean) return;
      const targetLang = vaultRef.current.profile.activeLang;
      try {
        const res = await translateTextDualEngine({
          text: clean,
          direction: 'foreign-to-zh',
          targetLang,
          tone: 'concise',
          geminiApiKey: vaultRef.current.profile.geminiApiKey,
          geminiModel: vaultRef.current.profile.geminiModel,
        });
        const now = Date.now();
        const seg: LiveSubtitleSegment = {
          id: `live-${now}-${Math.random().toString(36).slice(2, 6)}`,
          lang: targetLang,
          originalText: clean,
          translatedZh: res.translatedText,
          romanization: res.romanization,
          highlightKeywords: res.highlightKeywords,
          createdAt: now,
          updatedAt: now,
        };
        await commitVaultUpdate((prev) => ({
          ...prev,
          isUneditedDefault: false,
          updatedAt: now,
          liveSubtitles: [seg, ...prev.liveSubtitles].slice(0, 80),
        }));
      } catch {
        // ignore transient error
      }
    },
    [commitVaultUpdate]
  );

  const toggleLiveStreamListening = useCallback(() => {
    if (isLiveListeningRef.current) {
      isLiveListeningRef.current = false;
      setIsLiveListening(false);
      setLiveInterimText('');
      try {
        liveRecRef.current?.stop();
      } catch {
        // ignore
      }
      liveRecRef.current = null;
      return;
    }

    const SpeechCtor = getSpeechRecognitionCtor();
    if (!SpeechCtor) {
      notify('此裝置瀏覽器不支援連續串流收音，您可點選下方廣播模擬範例或手動貼上聽寫！');
      return;
    }

    try {
      const rec = new SpeechCtor();
      rec.lang = langCfg.bcp47;
      rec.continuous = true;
      rec.interimResults = true;
      let lastFinalIndex = -1;

      rec.onresult = (event: unknown) => {
        const e = event as {
          results?: ArrayLike<{
            isFinal?: boolean;
            0?: { transcript?: string };
          }>;
        };
        if (!e.results) return;
        let interim = '';
        for (let i = 0; i < e.results.length; i++) {
          const item = e.results[i];
          const txt = item[0]?.transcript || '';
          if (item.isFinal) {
            if (i > lastFinalIndex && txt.trim()) {
              lastFinalIndex = i;
              void appendLiveSegment(txt.trim());
            }
          } else {
            interim += txt;
          }
        }
        setLiveInterimText(interim.trim());
      };

      rec.onerror = () => {};
      rec.onend = () => {
        if (isLiveListeningRef.current) {
          try {
            lastFinalIndex = -1;
            rec.start();
          } catch {
            isLiveListeningRef.current = false;
            setIsLiveListening(false);
          }
        }
      };

      liveRecRef.current = rec;
      isLiveListeningRef.current = true;
      setIsLiveListening(true);
      rec.start();
      notify(`📻 已開啟【${langCfg.flag} ${langCfg.name}】隨身連續收音字幕機！`);
    } catch {
      isLiveListeningRef.current = false;
      setIsLiveListening(false);
      notify('無法啟動連續收音，請確認已允許麥克風權限。');
    }
  }, [langCfg, appendLiveSegment, notify]);

  // Tab 3: Menu sessions & Real Photo OCR Scanner!
  const currentMenuSession: MenuScanSession | null = useMemo(() => {
    if (vault.menuSessions.length === 0) return null;
    return (
      vault.menuSessions.find((m) => m.id === activeMenuId) ||
      vault.menuSessions[0]
    );
  }, [vault.menuSessions, activeMenuId]);

  const handleLoadDemoMenu = async (
    key: 'ja_izakaya' | 'ko_bbq' | 'fr_bistro'
  ) => {
    const demo = DEMO_MENU_SESSIONS[key];
    const now = Date.now();
    const session: MenuScanSession = {
      ...demo,
      id: `menu-demo-${key}-${now}`,
      ocrEngine: 'demo',
      items: demo.items.map((it) => ({ ...it })),
      createdAt: now,
      updatedAt: now,
    };
    setActiveMenuId(session.id);
    await commitVaultUpdate((prev) => ({
      ...prev,
      isUneditedDefault: false,
      updatedAt: now,
      profile: {
        ...prev.profile,
        activeLang: demo.lang,
      },
      menuSessions: [session, ...prev.menuSessions],
    }));
    notify(`📸 已載入範例菜單「${demo.title}」！`);
  };

  /**
   * 執行真實菜單圖片辨識（有 Gemini Key 時優先走 Gemini Vision；無 Key 時直接走瀏覽器內建 Tesseract.js 真實 OCR，絕不塞假資料！）
   */
  const runMenuImageRecognition = useCallback(
    async (
      imageDataUrl: string,
      orientation: 'horizontal' | 'vertical',
      existingSessionId?: string
    ) => {
      setIsAnalyzingMenu(true);
      setOcrStatusText('🔍 正在準備分析菜單圖片...');
      setOcrProgressPct(8);
      try {
        const hasGeminiKey = Boolean(
          vaultRef.current.profile.geminiApiKey &&
            vaultRef.current.profile.geminiApiKey.trim().length > 10
        );

        // 1. Try Gemini Vision if user configured a personal Gemini API key
        if (hasGeminiKey) {
          setOcrStatusText('✨ 正在使用 Gemini AI 視覺大腦辨識菜單照片...');
          setOcrProgressPct(45);
          const aiMenu = await analyzeMenuPhotoWithGemini({
            imageDataUrl,
            targetLang: activeLang,
            geminiApiKey: vaultRef.current.profile.geminiApiKey || '',
            geminiModel: vaultRef.current.profile.geminiModel,
          });
          if (aiMenu && aiMenu.items.length > 0) {
            const now = Date.now();
            const session: MenuScanSession = {
              id: existingSessionId || `menu-photo-${now}`,
              title: aiMenu.title,
              lang: activeLang,
              photoThumb: imageDataUrl,
              hasLocalHiResPhoto: true,
              ocrEngine: 'gemini',
              orientation,
              items: aiMenu.items,
              selectedNotes: [],
              createdAt: now,
              updatedAt: now,
            };
            setActiveMenuId(session.id);
            await commitVaultUpdate((prev) => ({
              ...prev,
              isUneditedDefault: false,
              updatedAt: now,
              menuSessions: existingSessionId
                ? prev.menuSessions.map((m) => (m.id === existingSessionId ? session : m))
                : [session, ...prev.menuSessions],
            }));
            notify(`✨ Gemini AI 成功從照片辨識出 ${aiMenu.items.length} 道真實餐點並完成翻譯！`);
            return;
          }
        }

        // 2. Built-in Zero-Key Real OCR Engine (Tesseract.js WASM + Contrast Preprocessing + Google GTX Translation)
        const ocrRes = await analyzeMenuPhotoFreeOcr({
          imageDataUrl,
          targetLang: activeLang,
          orientation,
          onProgress: (status, pct) => {
            setOcrStatusText(status);
            setOcrProgressPct(pct);
          },
        });

        const now = Date.now();
        const session: MenuScanSession = {
          id: existingSessionId || `menu-ocr-${now}`,
          title:
            ocrRes.items.length > 0
              ? ocrRes.title
              : `${langCfg.flag} 實拍菜單（請點下方切換直書／裁切重掃或修改文字）`,
          lang: activeLang,
          photoThumb: imageDataUrl,
          hasLocalHiResPhoto: true,
          ocrEngine: 'tesseract-ocr',
          orientation,
          items: ocrRes.items,
          selectedNotes: [],
          createdAt: now,
          updatedAt: now,
        };

        setActiveMenuId(session.id);
        if (ocrRes.rawOcrText) {
          setFreeMenuPasteText(
            ocrRes.items.map((it) => `${it.originalName}${it.priceForeign ? ` ${it.priceForeign}` : ''}`).join('\n') ||
              ocrRes.rawOcrText
          );
        }

        await commitVaultUpdate((prev) => ({
          ...prev,
          isUneditedDefault: false,
          updatedAt: now,
          menuSessions: existingSessionId
            ? prev.menuSessions.map((m) => (m.id === existingSessionId ? session : m))
            : [session, ...prev.menuSessions],
        }));

        if (ocrRes.items.length > 0) {
          notify(
            `✅ 已從您上傳的照片真實辨識出 ${ocrRes.items.length} 道${langCfg.name}項目並翻成繁中！（若為直排菜單可點「↕️ 切換直書重掃」）`
          );
        } else {
          setShowFreeMenuInput(true);
          notify(
            '⚠️ 這張照片背景較複雜或為直排字，請點照片下方「↕️ 切換日本直書重掃」或「✂️ 裁切局部重掃」'
          );
        }
      } catch {
        notify('辨識菜單圖片時發生問題，請試著裁切局部或貼上文字翻譯');
      } finally {
        setIsAnalyzingMenu(false);
        setOcrStatusText('');
        setOcrProgressPct(0);
      }
    },
    [activeLang, langCfg.flag, langCfg.name, commitVaultUpdate, notify]
  );

  const handleUploadMenuPhoto = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const thumbDataUrl = await compressImageFileToDataUrl(file, 1400, 0.86);
      await runMenuImageRecognition(thumbDataUrl, menuOrientation);
    } catch {
      notify('讀取照片失敗，請重試');
    }
  };

  // Support Ctrl+V / Command+V paste menu screenshot directly on the Menu tab!
  useEffect(() => {
    if (activeTab !== 'menu') return;
    const onPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            const thumbDataUrl = await compressImageFileToDataUrl(file, 1400, 0.86);
            await runMenuImageRecognition(thumbDataUrl, menuOrientation);
            return;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [activeTab, menuOrientation, runMenuImageRecognition]);

  // Re-scan current menu photo with different orientation or cropped region
  const handleRescanCurrentPhoto = async (
    newOrientation: 'horizontal' | 'vertical',
    cropPreset?: 'full' | 'left' | 'right' | 'center'
  ) => {
    if (!currentMenuSession?.photoThumb) return;
    setMenuOrientation(newOrientation);
    let targetImg = currentMenuSession.photoThumb;
    if (cropPreset === 'left') {
      targetImg = await cropImageDataUrl(targetImg, { xPct: 2, yPct: 5, wPct: 48, hPct: 90 });
    } else if (cropPreset === 'right') {
      targetImg = await cropImageDataUrl(targetImg, { xPct: 50, yPct: 5, wPct: 48, hPct: 90 });
    } else if (cropPreset === 'center') {
      targetImg = await cropImageDataUrl(targetImg, { xPct: 12, yPct: 10, wPct: 76, hPct: 80 });
    }
    await runMenuImageRecognition(targetImg, newOrientation, currentMenuSession.id);
  };

  const handleParseFreeMenuLines = async (replaceAll = false) => {
    const clean = freeMenuPasteText.trim();
    if (!clean) return;
    setIsAnalyzingMenu(true);
    setOcrStatusText('🌐 正在批次翻譯菜單項目...');
    setOcrProgressPct(65);
    try {
      const items = await parseAndTranslateMenuLinesFree(clean, activeLang);
      const now = Date.now();
      if (currentMenuSession) {
        await commitVaultUpdate((prev) => ({
          ...prev,
          isUneditedDefault: false,
          updatedAt: now,
          menuSessions: prev.menuSessions.map((m) =>
            m.id === currentMenuSession.id
              ? {
                  ...m,
                  items: replaceAll ? items : [...items, ...m.items],
                  updatedAt: now,
                }
              : m
          ),
        }));
      } else {
        const session: MenuScanSession = {
          id: `menu-free-${now}`,
          title: `${langCfg.flag} 自訂翻譯菜單 (${items.length} 道)`,
          lang: activeLang,
          ocrEngine: 'manual',
          items,
          selectedNotes: [],
          createdAt: now,
          updatedAt: now,
        };
        setActiveMenuId(session.id);
        await commitVaultUpdate((prev) => ({
          ...prev,
          isUneditedDefault: false,
          updatedAt: now,
          menuSessions: [session, ...prev.menuSessions],
        }));
      }
      setShowFreeMenuInput(false);
      notify(`🍜 已成功翻譯 ${items.length} 道餐點！`);
    } finally {
      setIsAnalyzingMenu(false);
      setOcrStatusText('');
      setOcrProgressPct(0);
    }
  };

  // Save inline edit on a single dish row
  const handleSaveInlineDishEdit = async (dishId: string) => {
    if (!currentMenuSession) return;
    const orig = editingDishOrig.trim();
    if (!orig) return;
    setIsAnalyzingMenu(true);
    try {
      let zh = editingDishZh.trim();
      if (!zh) {
        const res = await translateTextDualEngine({
          text: orig,
          direction: 'foreign-to-zh',
          targetLang: currentMenuSession.lang,
          geminiApiKey: vault.profile.geminiApiKey,
          geminiModel: vault.profile.geminiModel,
        });
        zh = res.translatedText;
      }
      const parsedPrice = Number.parseFloat(editingDishPrice.replace(/,/g, ''));
      const now = Date.now();
      await commitVaultUpdate((prev) => ({
        ...prev,
        isUneditedDefault: false,
        updatedAt: now,
        menuSessions: prev.menuSessions.map((m) =>
          m.id === currentMenuSession.id
            ? {
                ...m,
                updatedAt: now,
                items: m.items.map((it) =>
                  it.id === dishId
                    ? {
                        ...it,
                        originalName: orig,
                        translatedZh: zh,
                        priceForeign:
                          Number.isFinite(parsedPrice) && parsedPrice > 0
                            ? parsedPrice
                            : undefined,
                      }
                    : it
                ),
              }
            : m
        ),
      }));
      setEditingDishId(null);
      notify('✅ 已更新菜名與翻譯！');
    } finally {
      setIsAnalyzingMenu(false);
    }
  };

  const handleDeleteDishItem = async (dishId: string) => {
    if (!currentMenuSession) return;
    const now = Date.now();
    await commitVaultUpdate((prev) => ({
      ...prev,
      isUneditedDefault: false,
      updatedAt: now,
      menuSessions: prev.menuSessions.map((m) =>
        m.id === currentMenuSession.id
          ? {
              ...m,
              updatedAt: now,
              items: m.items.filter((it) => it.id !== dishId),
            }
          : m
      ),
    }));
  };

  const handleUpdateDishQty = async (dishId: string, delta: number) => {
    if (!currentMenuSession) return;
    const now = Date.now();
    await commitVaultUpdate((prev) => ({
      ...prev,
      isUneditedDefault: false,
      updatedAt: now,
      menuSessions: prev.menuSessions.map((m) =>
        m.id === currentMenuSession.id
          ? {
              ...m,
              updatedAt: now,
              items: m.items.map((it) =>
                it.id === dishId
                  ? { ...it, quantity: Math.max(0, it.quantity + delta) }
                  : it
              ),
            }
          : m
      ),
    }));
  };

  const handleToggleMenuNote = async (noteId: string) => {
    if (!currentMenuSession) return;
    const now = Date.now();
    await commitVaultUpdate((prev) => ({
      ...prev,
      isUneditedDefault: false,
      updatedAt: now,
      menuSessions: prev.menuSessions.map((m) => {
        if (m.id !== currentMenuSession.id) return m;
        const exists = m.selectedNotes.includes(noteId);
        return {
          ...m,
          updatedAt: now,
          selectedNotes: exists
            ? m.selectedNotes.filter((id) => id !== noteId)
            : [...m.selectedNotes, noteId],
        };
      }),
    }));
  };

  // Tab 4: Add custom survival phrase card
  const handleAddCustomPhrase = async () => {
    const cleanZh = newCustomZh.trim();
    if (!cleanZh) return;
    let foreign = newCustomForeign.trim();
    let romanization = '';
    let phonetic = newCustomPhonetic.trim();

    if (!foreign) {
      const res = await translateTextDualEngine({
        text: cleanZh,
        direction: 'zh-to-foreign',
        targetLang: activeLang,
        tone: 'polite',
        geminiApiKey: vault.profile.geminiApiKey,
        geminiModel: vault.profile.geminiModel,
      });
      foreign = res.translatedText;
      romanization = res.romanization;
      if (!phonetic) phonetic = res.phoneticHint;
    }

    const now = Date.now();
    const card: CustomPhraseCard = {
      id: `custom-${now}`,
      category: 'custom',
      lang: activeLang,
      zhText: cleanZh,
      foreignText: foreign,
      romanization,
      phoneticHint: phonetic,
      pinned: true,
      createdAt: now,
      updatedAt: now,
    };

    await commitVaultUpdate((prev) => ({
      ...prev,
      isUneditedDefault: false,
      updatedAt: now,
      customPhrases: [card, ...prev.customPhrases],
    }));

    setNewCustomZh('');
    setNewCustomForeign('');
    setNewCustomPhonetic('');
    setShowAddCustomModal(false);
    setSelectedCategory('custom');
    notify('🪧 已新增至「我的專屬小卡」，離線也能隨時放大秀給店員／司機看！');
  };

  const handleDeleteCustomPhrase = async (id: string) => {
    const now = Date.now();
    await commitVaultUpdate((prev) => ({
      ...prev,
      isUneditedDefault: false,
      updatedAt: now,
      customPhrases: prev.customPhrases.filter((p) => p.id !== id),
      deletedIds: {
        ...prev.deletedIds,
        [id]: now,
      },
    }));
  };

  // Tab 5: Voice price & Exchange Rate helpers
  const handleRefreshLiveRates = async () => {
    setIsUpdatingRates(true);
    try {
      const liveRates = await fetchLiveExchangeRatesToTwd();
      if (Object.keys(liveRates).length > 0) {
        const now = Date.now();
        await commitVaultUpdate((prev) => ({
          ...prev,
          isUneditedDefault: false,
          updatedAt: now,
          settingsUpdatedAt: now,
          profile: {
            ...prev.profile,
            customRatesToTwd: {
              ...prev.profile.customRatesToTwd,
              ...liveRates,
            },
          },
        }));
        notify('💴 已更新最新國際即時匯率！');
      } else {
        notify('目前離線，已使用內建預設匯率換算');
      }
    } finally {
      setIsUpdatingRates(false);
    }
  };

  const handleVoicePriceInput = () => {
    const SpeechCtor = getSpeechRecognitionCtor();
    if (!SpeechCtor) {
      notify('請直接在數字框輸入標價金額');
      return;
    }
    if (isListeningPrice) {
      setIsListeningPrice(false);
      return;
    }
    try {
      const rec = new SpeechCtor();
      rec.lang = 'zh-TW';
      rec.continuous = false;
      rec.interimResults = false;
      setIsListeningPrice(true);
      rec.onresult = (event: unknown) => {
        const e = event as {
          results?: ArrayLike<ArrayLike<{ transcript?: string }>>;
        };
        const transcript = e.results?.[0]?.[0]?.transcript || '';
        const digits = transcript.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
        if (digits) {
          setCalcAmountStr(digits[0]);
          notify(`🎙️ 已辨識金額：${langCfg.currencySymbol}${digits[0]}`);
        } else {
          notify(`聽到的內容：「${transcript}」，請直接說出阿拉伯數字金額`);
        }
      };
      rec.onend = () => setIsListeningPrice(false);
      rec.onerror = () => setIsListeningPrice(false);
      rec.start();
    } catch {
      setIsListeningPrice(false);
    }
  };

  const handleAddShoppingItem = async () => {
    const num = Number.parseFloat(calcAmountStr.replace(/,/g, ''));
    if (!Number.isFinite(num) || num <= 0) return;
    const now = Date.now();
    const item: ShoppingCalcItem = {
      id: `shop-${now}`,
      title: calcItemTitle.trim() || `${langCfg.countryName}戰利品 #${vault.shoppingItems.length + 1}`,
      lang: activeLang,
      amountForeign: num,
      amountTwd: Math.round(num * activeRateToTwd),
      createdAt: now,
      updatedAt: now,
    };
    setCalcItemTitle('');
    await commitVaultUpdate((prev) => ({
      ...prev,
      isUneditedDefault: false,
      updatedAt: now,
      shoppingItems: [item, ...prev.shoppingItems],
    }));
    notify('🛍️ 已加入今日血拚退稅湊單清單！');
  };

  const handleDeleteShoppingItem = async (id: string) => {
    const now = Date.now();
    await commitVaultUpdate((prev) => ({
      ...prev,
      isUneditedDefault: false,
      updatedAt: now,
      shoppingItems: prev.shoppingItems.filter((s) => s.id !== id),
      deletedIds: {
        ...prev.deletedIds,
        [id]: now,
      },
    }));
  };

  // Settings modal handlers
  const openSettingsAndLoadSnapshots = async () => {
    setShowSettingsModal(true);
    const snaps = await listLocalHistorySnapshots();
    setHistorySnapshots(snaps);
  };

  const handleBindPasscode = async () => {
    const clean = normalizePasscode(passcodeInput);
    if (!clean) {
      notify('請輸入自訂通行碼（例如妳常用的英文或數字代號）');
      return;
    }
    passcodeRef.current = clean;
    setPasscode(clean);
    await saveRememberedPasscode(clean);
    setSyncStatus('syncing');
    const { merged, synced, matchedPasscode } = await syncVaultWithCloud(
      vaultRef.current,
      clean
    );
    vaultRef.current = merged;
    setVault(merged);
    if (matchedPasscode && matchedPasscode !== clean) {
      passcodeRef.current = matchedPasscode;
      setPasscode(matchedPasscode);
      setPasscodeInput(matchedPasscode);
      await saveRememberedPasscode(matchedPasscode);
    }
    setSyncStatus(synced ? 'synced' : 'pending');
    notify(
      synced
        ? '🔐 通行碼保險箱已綁定並完成跨裝置雲端同步！'
        : '🔐 通行碼已保存在本機保險箱（將於恢復連線時自動同步雲端）'
    );
  };

  const handleRestoreSnapshot = async (snap: LocalHistorySnapshot) => {
    const parsed = parseVaultJson(snap.stateJson);
    if (!parsed) return;
    const merged = mergeVaultStates(vaultRef.current, {
      ...parsed,
      isUneditedDefault: false,
      updatedAt: Date.now(),
    });
    vaultRef.current = merged;
    setVault(merged);
    await saveLocalVaultState(merged);
    if (passcodeRef.current) {
      await pushVaultToCloud(merged, passcodeRef.current);
    }
    notify('🛟 已成功從本機歷史快照無損合併救回紀錄！');
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const merged = importVaultBackupJson(
          String(reader.result || ''),
          vaultRef.current
        );
        vaultRef.current = merged;
        setVault(merged);
        await saveLocalVaultState(merged);
        if (passcodeRef.current) {
          await pushVaultToCloud(merged, passcodeRef.current);
        }
        notify('📦 備份檔匯入成功！');
      } catch (err) {
        notify(err instanceof Error ? err.message : '匯入備份檔失敗');
      }
    };
    reader.readAsText(file);
  };

  // Combined custom phrases (user created + seed templates)
  const displayCustomPhrases = useMemo(() => {
    const seeds = buildSeedCustomPhrases().filter(
      (s) => !vault.deletedIds[s.id]
    );
    const map = new Map<string, CustomPhraseCard>();
    for (const c of [...seeds, ...vault.customPhrases]) {
      if (!vault.deletedIds[c.id]) {
        map.set(c.id, c);
      }
    }
    return Array.from(map.values());
  }, [vault.customPhrases, vault.deletedIds]);

  // Latest partner/me dialogue turn for top 180° Face-to-Face card
  const latestTurn = vault.dialogues[0] || null;

  // Point-to-Order selected items summary
  const selectedMenuDishes = useMemo(() => {
    if (!currentMenuSession) return [];
    return currentMenuSession.items.filter((it) => it.quantity > 0);
  }, [currentMenuSession]);

  const selectedMenuTotalForeign = useMemo(() => {
    return selectedMenuDishes.reduce(
      (acc, it) => acc + (it.priceForeign || 0) * it.quantity,
      0
    );
  }, [selectedMenuDishes]);

  // Tax-free calculator derived numbers
  const parsedCalcForeign = Number.parseFloat(calcAmountStr.replace(/,/g, '')) || 0;
  const calcTwd = Math.round(parsedCalcForeign * activeRateToTwd);
  const todayShoppingSumForeign = useMemo(() => {
    return vault.shoppingItems
      .filter((s) => s.lang === activeLang)
      .reduce((acc, s) => acc + s.amountForeign, 0);
  }, [vault.shoppingItems, activeLang]);
  const combinedTaxFreeForeign = parsedCalcForeign + todayShoppingSumForeign;
  const taxFreeProgressPct = Math.min(
    100,
    Math.round((combinedTaxFreeForeign / Math.max(1, langCfg.taxFreeThreshold)) * 100)
  );
  const taxRefundForeign = Math.round(
    combinedTaxFreeForeign * (langCfg.taxFreeRatePct / (100 + langCfg.taxFreeRatePct))
  );
  const taxRefundTwd = Math.round(taxRefundForeign * activeRateToTwd);

  return (
    <div className="min-h-screen bg-[#ECE8DF] text-[#2D251E] pb-28">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] bg-[#2D251E] text-[#FAF8F3] px-4 py-2.5 rounded-2xl shadow-pop text-xs font-bold flex items-center justify-between gap-2 border border-[#5C5044]">
          <span>{toastMsg}</span>
          <button
            type="button"
            onClick={() => setToastMsg('')}
            className="text-[#F2CA62] shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 bg-[#ECE8DF]/95 backdrop-blur-md border-b border-[#DDD7C9] px-3.5 py-2.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <QuokkaBoboTravelBadge
              recording={Boolean(recordingSide) || isLiveListening}
              className="w-12 h-10"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-[#2D251E] truncate">
                  BoboTalk 出國翻譯蒟蒻
                </h1>
                {vault.profile.geminiApiKey ? (
                  <span className="px-2 py-0.5 rounded-full bg-[#F2CA62] text-[#2D251E] text-[10px] font-black shrink-0">
                    ✨ AI 大腦
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-[#EFECE4] border border-[#DDD7C9] text-[#5C5044] text-[10px] font-bold shrink-0">
                    🟢 免Key即用
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#5C5044]">
                <span className="truncate">
                  {langCfg.flag} {langCfg.countryName}（{langCfg.name}）
                </span>
                {fingerprintBadge && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#FAF8F3] border border-[#DDD7C9] text-[10px] font-bold text-[#2D251E]">
                    {fingerprintBadge}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Cloud Sync & Settings Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void handleManualOrAutoSync(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FAF8F3] hover:bg-[#EFECE4] border border-[#DDD7C9] text-xs font-bold text-[#2D251E] shadow-sm active:scale-95 transition"
              title="跨瀏覽器／主畫面 App 雲端同步"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  syncStatus === 'syncing' ? 'animate-spin text-[#C48E63]' : 'text-[#2D251E]'
                }`}
              />
              <span className="hidden sm:inline">🔄 雲端同步</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  syncStatus === 'synced'
                    ? 'bg-emerald-600'
                    : syncStatus === 'pending'
                    ? 'bg-amber-500'
                    : 'bg-[#C48E63]'
                }`}
              />
            </button>
            <button
              type="button"
              onClick={() => void openSettingsAndLoadSnapshots()}
              className="p-2 rounded-xl bg-[#FAF8F3] hover:bg-[#EFECE4] border border-[#DDD7C9] text-[#2D251E] shadow-sm active:scale-95 transition"
              aria-label="開啟設定與雲端保險箱"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Country / Language Quick Switcher Pill Strip */}
        <div className="max-w-2xl mx-auto mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {LANGUAGE_LIST.map((item) => {
            const active = item.code === activeLang;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => handleSelectLanguage(item.code)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 transition border ${
                  active
                    ? 'bg-[#F2CA62] text-[#2D251E] border-[#C48E63] shadow-sm'
                    : 'bg-[#FAF8F3] text-[#5C5044] border-[#DDD7C9] hover:bg-[#EFECE4]'
                }`}
              >
                <span>{item.flag}</span>
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-2xl mx-auto px-3.5 pt-3 space-y-3.5">
        {/* Hero Welcome Card */}
        <section className="bg-[#FAF8F3] rounded-3xl border border-[#DDD7C9] shadow-card p-3.5 flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EFECE4] border border-[#DDD7C9] text-[11px] font-bold text-[#5C5044]">
              <span>✈️ Quokka & BOBO 隨身出國口譯</span>
            </div>
            <h2 className="text-sm sm:text-base font-black text-[#2D251E]">
              {langCfg.flag} 正在前往{langCfg.countryName}旅行模式
            </h2>
            <p className="text-xs text-[#5C5044] leading-relaxed">
              內建「✅ 雙向回譯驗算＋逐詞拆解」確保每句口譯 100% 準確，並支援實拍菜單 OCR 點餐卡！
            </p>
          </div>
          <HeroTravelBanner className="w-28 h-20 sm:w-36 sm:h-24" />
        </section>

        {/* ========================================================= */}
        {/* TAB 1: 🎙️ 雙向對講 (Face-to-Face Split Card & Voice Talk) */}
        {/* ========================================================= */}
        {activeTab === 'talk' && (
          <div className="space-y-3.5">
            {/* Partner Face-to-Face Card (Can rotate 180° to face the clerk/driver across the table!) */}
            <section className="bg-[#FAF8F3] rounded-3xl border-2 border-[#DDD7C9] shadow-card overflow-hidden">
              <div className="bg-[#EFECE4] px-3.5 py-2 border-b border-[#DDD7C9] flex items-center justify-between gap-2">
                <span className="text-xs font-black text-[#5C5044] flex items-center gap-1.5">
                  <span>{langCfg.flag}</span>
                  <span>對方看這區（{langCfg.name}大字卡）</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleToggleFlip}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
                      vault.profile.faceToFaceFlipped
                        ? 'bg-[#1E3158] text-white border-[#1E3158]'
                        : 'bg-[#FAF8F3] text-[#2D251E] border-[#DDD7C9]'
                    }`}
                  >
                    <FlipVertical2 className="w-3.5 h-3.5" />
                    <span>
                      {vault.profile.faceToFaceFlipped
                        ? '已 180° 翻轉向對面'
                        : '180° 翻轉給對面看'}
                    </span>
                  </button>
                  {latestTurn && (
                    <button
                      type="button"
                      onClick={() =>
                        setJumboCard({
                          titleZh:
                            latestTurn.speaker === 'me'
                              ? latestTurn.sourceText
                              : latestTurn.translatedText,
                          foreignText:
                            latestTurn.speaker === 'me'
                              ? latestTurn.translatedText
                              : latestTurn.sourceText,
                          romanization: latestTurn.romanization,
                          phoneticHint: latestTurn.phoneticHint,
                          backTranslatedText: latestTurn.backTranslatedText,
                          lang: latestTurn.targetLang,
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F2CA62] text-[#2D251E] text-[11px] font-black border border-[#C48E63]"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>全螢幕秀卡</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Rotatable Foreign Display Area */}
              <div
                className={`p-4 transition-transform duration-300 ${
                  vault.profile.faceToFaceFlipped ? 'rotate-180' : ''
                }`}
              >
                {latestTurn ? (
                  <div className="space-y-2.5">
                    <div className="text-xs font-bold text-[#8A7E70]">
                      {latestTurn.speaker === 'me'
                        ? `🇹🇼 我說：${latestTurn.sourceText}`
                        : `${LANGUAGES[latestTurn.targetLang].flag} 對方說：${
                            latestTurn.sourceText
                          }`}
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-[#2D251E] leading-snug break-words">
                      {latestTurn.speaker === 'me'
                        ? latestTurn.translatedText
                        : latestTurn.sourceText}
                    </div>

                    {/* Back-Translation Accuracy Verification Banner */}
                    {latestTurn.backTranslatedText && (
                      <div className="p-2.5 rounded-2xl bg-emerald-950/5 border border-emerald-700/30 flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span className="text-[11px] font-black text-emerald-800">
                              ✅ 雙向回譯驗算（對方實際讀到的意思）：
                            </span>
                            {latestTurn.confidenceScore && (
                              <span className="px-1.5 py-0.2 rounded-full bg-emerald-700 text-white text-[10px] font-black">
                                語意吻合 {latestTurn.confidenceScore}%
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-[#2D251E]">
                            「{latestTurn.backTranslatedText}」
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Word-by-Word Vocabulary Breakdown Chips */}
                    {latestTurn.wordBreakdowns && latestTurn.wordBreakdowns.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-black text-[#8A7E70]">
                          🧩 關鍵字核對：
                        </span>
                        {latestTurn.wordBreakdowns.map((wb, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg bg-[#FAF8F3] border border-[#DDD7C9] text-[11px] font-bold text-[#2D251E]"
                          >
                            <strong className="text-[#C48E63]">{wb.term}</strong> = {wb.meaning}
                            {wb.pronunciation ? ` (${wb.pronunciation})` : ''}
                          </span>
                        ))}
                      </div>
                    )}

                    {latestTurn.romanization && (
                      <div className="text-xs font-semibold text-[#5C5044]">
                        🔤 {latestTurn.romanization}
                      </div>
                    )}
                    {latestTurn.phoneticHint && (
                      <div className="inline-block px-2.5 py-1 rounded-xl bg-[#EFECE4] border border-[#DDD7C9] text-xs font-bold text-[#2D251E]">
                        🗣️ 空耳發音：{latestTurn.phoneticHint}
                      </div>
                    )}
                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          speakTextTTS(
                            latestTurn.speaker === 'me'
                              ? latestTurn.translatedText
                              : latestTurn.sourceText,
                            LANGUAGES[latestTurn.targetLang].bcp47,
                            0.95
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F2CA62] text-[#2D251E] text-xs font-black border border-[#C48E63] shadow-sm active:scale-95"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>🔊 朗讀{LANGUAGES[latestTurn.targetLang].name}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          speakTextTTS(
                            latestTurn.speaker === 'me'
                              ? latestTurn.translatedText
                              : latestTurn.sourceText,
                            LANGUAGES[latestTurn.targetLang].bcp47,
                            0.7
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#EFECE4] text-[#5C5044] text-xs font-bold border border-[#DDD7C9] active:scale-95"
                      >
                        <span>🐢 0.7x 慢速</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center space-y-1">
                    <p className="text-base font-black text-[#2D251E]">
                      {langCfg.orderGreeting}
                    </p>
                    <p className="text-xs text-[#8A7E70]">
                      點按下方「🎙️ 我說中文」或「🎧 聽對方說{langCfg.name}」，這裡會即時放大顯示翻譯、自動附上「✅ 雙向回譯驗算」並可 180° 轉給店員看！
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Dual Big Voice Recording Buttons + Tone Selector */}
            <section className="bg-[#FAF8F3] rounded-3xl border border-[#DDD7C9] shadow-card p-3.5 space-y-3">
              {/* Tone selector & Confirm transcript toggle */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-[#5C5044]">
                    🎭 語氣：
                  </span>
                  {(
                    [
                      { id: 'polite', label: '🙇 禮貌敬語' },
                      { id: 'concise', label: '🪧 精簡大字卡' },
                      { id: 'casual', label: '😊 自然口語' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTone(t.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
                        vault.profile.preferredTone === t.id
                          ? 'bg-[#C48E63] text-white border-[#C48E63]'
                          : 'bg-[#EFECE4] text-[#5C5044] border-[#DDD7C9]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleToggleConfirmBeforeSend}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
                    vault.profile.confirmTranscriptBeforeSend
                      ? 'bg-[#1E3158] text-white border-[#1E3158]'
                      : 'bg-[#EFECE4] text-[#5C5044] border-[#DDD7C9]'
                  }`}
                  title="開啟後，語音聽寫出的文字會先放入輸入框讓妳確認無錯字再翻譯"
                >
                  {vault.profile.confirmTranscriptBeforeSend
                    ? '✓ 聽寫後先確認文字再翻'
                    : '⚡ 聽寫完直接秒翻'}
                </button>
              </div>

              {/* Interim voice transcript status */}
              {(recordingSide || isTranslating || interimTranscript) && (
                <div className="p-3 rounded-2xl bg-[#EFECE4] border border-[#C48E63] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C83D33] animate-ping shrink-0" />
                    <span className="text-xs font-bold text-[#2D251E] truncate">
                      {isTranslating
                        ? '✨ 正在即時翻譯並執行「🔄 雙向回譯正確性驗算」...'
                        : interimTranscript
                        ? `聽寫中：「${interimTranscript}」`
                        : recordingSide === 'me'
                        ? '🎙️ 請開始說中文（說完自動翻譯＋回譯驗算）...'
                        : `🎧 請讓對方說${langCfg.name}（說完自動翻成繁中）...`}
                    </span>
                  </div>
                  {recordingSide && (
                    <button
                      type="button"
                      onClick={stopVoiceCapture}
                      className="px-2.5 py-1 rounded-xl bg-[#C83D33] text-white text-xs font-black shrink-0"
                    >
                      完成收音
                    </button>
                  )}
                </div>
              )}

              {/* Big Dual Push-to-Talk Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => void startVoiceCapture('me')}
                  className={`relative py-4 px-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition active:scale-95 ${
                    recordingSide === 'me'
                      ? 'bg-[#C83D33] text-white border-[#2D251E] shadow-pop'
                      : 'bg-[#F2CA62] hover:bg-[#e9be50] text-[#2D251E] border-[#C48E63] shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Mic className="w-5 h-5" />
                    <span className="text-sm sm:text-base font-black">
                      {recordingSide === 'me' ? '點擊結束收音' : '🇹🇼 我說中文'}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-bold ${
                      recordingSide === 'me' ? 'text-white/90' : 'text-[#5C5044]'
                    }`}
                  >
                    翻成{langCfg.flag}
                    {langCfg.name}＋雙向回譯驗算
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => void startVoiceCapture('partner')}
                  className={`relative py-4 px-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition active:scale-95 ${
                    recordingSide === 'partner'
                      ? 'bg-[#C83D33] text-white border-[#2D251E] shadow-pop'
                      : 'bg-[#1E3158] hover:bg-[#273f70] text-white border-[#1E3158] shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Mic className="w-5 h-5" />
                    <span className="text-sm sm:text-base font-black">
                      {recordingSide === 'partner'
                        ? '點擊結束收音'
                        : `${langCfg.flag} 對方說${langCfg.name}`}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-white/85">
                    自動翻成🇹🇼繁體中文＋單字拆解
                  </span>
                </button>
              </div>

              {/* Manual Text / Editable Input Bar */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setInputDirection((d) =>
                        d === 'zh-to-foreign' ? 'foreign-to-zh' : 'zh-to-foreign'
                      )
                    }
                    className="px-2.5 py-2 rounded-xl bg-[#EFECE4] border border-[#DDD7C9] text-xs font-bold text-[#2D251E] shrink-0 flex items-center gap-1"
                    title="切換輸入方向"
                  >
                    <Languages className="w-3.5 h-3.5 text-[#C48E63]" />
                    <span>
                      {inputDirection === 'zh-to-foreign'
                        ? `中 ➔ ${langCfg.name}`
                        : `${langCfg.name} ➔ 中`}
                    </span>
                  </button>
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && inputText.trim()) {
                        const txt = inputText;
                        setInputText('');
                        void executeDialogueTranslation(
                          txt,
                          inputDirection === 'zh-to-foreign' ? 'me' : 'partner'
                        );
                      }
                    }}
                    placeholder={
                      inputDirection === 'zh-to-foreign'
                        ? `輸入中文秒翻${langCfg.name}（如：這個請給我兩份去冰）...`
                        : `貼上或輸入${langCfg.name}秒翻繁體中文...`
                    }
                    className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white border border-[#DDD7C9] text-xs sm:text-sm text-[#2D251E] focus:outline-none focus:border-[#C48E63]"
                  />
                  <button
                    type="button"
                    disabled={isTranslating || !inputText.trim()}
                    onClick={() => {
                      const txt = inputText;
                      setInputText('');
                      void executeDialogueTranslation(
                        txt,
                        inputDirection === 'zh-to-foreign' ? 'me' : 'partner'
                      );
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#C48E63] disabled:opacity-45 text-white text-xs font-black shrink-0 flex items-center gap-1 shadow-sm active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>翻譯</span>
                  </button>
                </div>

                {/* Quick 1-Tap Travel Voice Prompt Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                  <span className="text-[11px] font-bold text-[#8A7E70] shrink-0">
                    ⚡ 點一下秒翻：
                  </span>
                  {langCfg.sampleVoicePrompts.zh.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => void executeDialogueTranslation(sample, 'me')}
                      className="px-2.5 py-1 rounded-full bg-[#EFECE4] hover:bg-[#F2CA62]/50 border border-[#DDD7C9] text-[11px] font-bold text-[#5C5044] shrink-0 transition"
                    >
                      {sample}
                    </button>
                  ))}
                  {langCfg.sampleVoicePrompts.foreign.map((sample, idx) => (
                    <button
                      key={`f-${idx}`}
                      type="button"
                      onClick={() =>
                        void executeDialogueTranslation(sample, 'partner')
                      }
                      className="px-2.5 py-1 rounded-full bg-[#1E3158]/10 hover:bg-[#1E3158]/20 border border-[#1E3158]/20 text-[11px] font-bold text-[#1E3158] shrink-0 transition"
                    >
                      🎧 模擬店員說：{sample.slice(0, 18)}...
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Dialogue History Stream with 4-Layer Accuracy Verification */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black text-[#5C5044]">
                  💬 即時對話翻譯紀錄（每筆皆附「✅ 雙向回譯驗算」確保語意無誤）
                </h3>
              </div>

              {vault.dialogues.length === 0 ? (
                <div className="bg-[#FAF8F3] rounded-3xl border border-[#DDD7C9] p-6 text-center space-y-2">
                  <p className="text-sm font-bold text-[#5C5044]">
                    還沒有對話紀錄～點上方「⚡ 點一下秒翻」或按麥克風，即可看到「雙向回譯驗算」與「關鍵單字拆解」！
                  </p>
                </div>
              ) : (
                vault.dialogues.map((turn) => {
                  const tCfg = LANGUAGES[turn.targetLang] || langCfg;
                  const isMe = turn.speaker === 'me';
                  const foreignSentence = isMe
                    ? turn.translatedText
                    : turn.sourceText;
                  const zhSentence = isMe
                    ? turn.sourceText
                    : turn.translatedText;
                  const isEditingThis = editingTurnId === turn.id;

                  return (
                    <div
                      key={turn.id}
                      className={`rounded-3xl border p-3.5 shadow-card space-y-2.5 ${
                        isMe
                          ? 'bg-[#FAF8F3] border-[#DDD7C9]'
                          : 'bg-[#EFECE4] border-[#C48E63]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                              isMe
                                ? 'bg-[#F2CA62] text-[#2D251E]'
                                : 'bg-[#1E3158] text-white'
                            }`}
                          >
                            {isMe
                              ? `🇹🇼 我說 ➔ ${tCfg.flag}${tCfg.name}`
                              : `${tCfg.flag} 對方說 ➔ 🇹🇼繁中`}
                          </span>
                          <span className="text-[10px] font-bold text-[#8A7E70]">
                            {turn.engine === 'gemini'
                              ? '✨ Gemini 口譯'
                              : turn.engine === 'offline'
                              ? '🪧 離線標準句'
                              : '🟢 即時雙向翻譯'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTurnId(isEditingThis ? null : turn.id);
                              setEditingTurnText(turn.sourceText);
                            }}
                            className="px-2 py-1 rounded-xl bg-white border border-[#DDD7C9] text-[11px] font-bold text-[#5C5044] flex items-center gap-1"
                            title="若麥克風聽錯字，可點此改字立即重翻"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>改字重翻</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleToggleStarTurn(turn)}
                            className={`p-1.5 rounded-xl border transition ${
                              turn.starred
                                ? 'bg-[#F2CA62] text-[#2D251E] border-[#C48E63]'
                                : 'bg-white text-[#8A7E70] border-[#DDD7C9]'
                            }`}
                            title="收藏到離線手指卡"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                turn.starred ? 'fill-current' : ''
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setJumboCard({
                                titleZh: zhSentence,
                                foreignText: foreignSentence,
                                romanization: turn.romanization,
                                phoneticHint: turn.phoneticHint,
                                backTranslatedText: turn.backTranslatedText,
                                lang: turn.targetLang,
                              })
                            }
                            className="p-1.5 rounded-xl bg-white border border-[#DDD7C9] text-[#2D251E]"
                            title="放大全螢幕秀給店員看"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteTurn(turn.id)}
                            className="p-1.5 rounded-xl bg-white border border-[#DDD7C9] text-[#8A7E70] hover:text-[#C83D33]"
                            title="刪除此筆紀錄"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Inline Edit Source Text if mic misheard a character */}
                      {isEditingThis ? (
                        <div className="p-2.5 rounded-2xl bg-white border border-[#C48E63] space-y-2">
                          <div className="text-[11px] font-black text-[#5C5044]">
                            ✏️ 修改聽寫原文並重新翻譯：
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingTurnText}
                              onChange={(e) => setEditingTurnText(e.target.value)}
                              className="flex-1 px-2.5 py-1.5 rounded-xl bg-[#FAF8F3] border border-[#DDD7C9] text-xs font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const txt = editingTurnText;
                                setEditingTurnId(null);
                                void executeDialogueTranslation(
                                  txt,
                                  turn.speaker,
                                  turn.targetLang,
                                  turn.id
                                );
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[#C48E63] text-white text-xs font-black"
                            >
                              重翻並驗算
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-[#5C5044]">
                          原文：{turn.sourceText}
                        </div>
                      )}

                      <div className="text-base sm:text-lg font-black text-[#2D251E] leading-snug">
                        {turn.translatedText}
                      </div>

                      {/* Layer 1: Independent Back-Translation Verification Box */}
                      {turn.backTranslatedText && (
                        <div className="p-2.5 rounded-2xl bg-emerald-950/5 border border-emerald-700/30 space-y-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[11px] font-black text-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>
                                🔍 雙向回譯驗算（把外文獨立翻回中文核對）：
                              </span>
                            </span>
                            {turn.confidenceScore && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  turn.confidenceScore >= 85
                                    ? 'bg-emerald-700 text-white'
                                    : 'bg-amber-600 text-white'
                                }`}
                              >
                                {turn.confidenceScore >= 85
                                  ? `✅ 語意吻合 ${turn.confidenceScore}%`
                                  : `⚠️ 建議核對 (${turn.confidenceScore}%)`}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-[#2D251E]">
                            「{turn.backTranslatedText}」
                          </div>
                        </div>
                      )}

                      {/* Layer 2: Word-by-Word Breakdown Chips */}
                      {turn.wordBreakdowns && turn.wordBreakdowns.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-black text-[#8A7E70]">
                            🧩 逐詞核對：
                          </span>
                          {turn.wordBreakdowns.map((wb, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-lg bg-white border border-[#DDD7C9] text-[11px] font-bold text-[#2D251E]"
                            >
                              <strong className="text-[#C48E63]">{wb.term}</strong> = {wb.meaning}
                              {wb.pronunciation ? ` (${wb.pronunciation})` : ''}
                            </span>
                          ))}
                        </div>
                      )}

                      {turn.romanization && (
                        <div className="text-xs text-[#5C5044]">
                          🔤 {turn.romanization}
                        </div>
                      )}
                      {turn.phoneticHint && (
                        <div className="text-xs font-bold text-[#2D251E] bg-[#EFECE4] px-2.5 py-1 rounded-xl border border-[#DDD7C9]">
                          🗣️ {turn.phoneticHint}
                        </div>
                      )}
                      {turn.alternativeText && (
                        <div className="text-xs font-bold text-[#5C5044] bg-white px-2.5 py-1 rounded-xl border border-[#DDD7C9]">
                          🔀 替換直白短句：{turn.alternativeText}
                        </div>
                      )}
                      {turn.culturalTip && (
                        <div className="text-[11px] font-bold text-[#C48E63]">
                          💡 {turn.culturalTip}
                        </div>
                      )}

                      <div className="pt-1 flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() =>
                            speakTextTTS(foreignSentence, tCfg.bcp47, 0.95)
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#F2CA62] text-[#2D251E] text-xs font-black border border-[#C48E63]"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>朗讀{tCfg.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            speakTextTTS(foreignSentence, tCfg.bcp47, 0.7)
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white text-[#5C5044] text-xs font-bold border border-[#DDD7C9]"
                        >
                          <span>🐢 0.7x 慢速</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(foreignSentence);
                            notify('📋 已複製外語句子！');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white text-[#5C5044] text-xs font-bold border border-[#DDD7C9]"
                        >
                          <Copy className="w-3 h-3" />
                          <span>複製</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: 📻 隨身字幕機 (Live Broadcast & Tour Guide Stream)   */}
        {/* ========================================================= */}
        {activeTab === 'live' && (
          <div className="space-y-3.5">
            <section className="bg-[#FAF8F3] rounded-3xl border border-[#DDD7C9] shadow-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-[#2D251E] flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-[#C83D33]" />
                    <span>📻 隨身連續收音字幕機（廣播／導覽／長篇解說）</span>
                  </h3>
                  <p className="text-xs text-[#5C5044] mt-0.5">
                    在機場聽登機門廣播、搭電車聽臨時通知、或餐廳店員快速解說用餐規定時，自動連續聽寫【{langCfg.flag}
                    {langCfg.name}】並即時翻成繁體中文字幕＋高亮數字重點！
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={toggleLiveStreamListening}
                  className={`flex-1 py-3 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border-2 transition active:scale-95 ${
                    isLiveListening
                      ? 'bg-[#C83D33] text-white border-[#2D251E] shadow-pop'
                      : 'bg-[#F2CA62] text-[#2D251E] border-[#C48E63] shadow-sm'
                  }`}
                >
                  <Radio
                    className={`w-4 h-4 ${isLiveListening ? 'animate-spin' : ''}`}
                  />
                  <span>
                    {isLiveListening
                      ? `⏸️ 停止連續收音（正在聽取${langCfg.name}...）`
                      : `▶️ 開始連續收音即時字幕（聽${langCfg.flag}${langCfg.name}）`}
                  </span>
                </button>
              </div>

              {isLiveListening && (
                <div className="p-3 rounded-2xl bg-[#EFECE4] border border-[#C48E63] text-xs font-bold text-[#2D251E]">
                  🎙️ 即時收音串流中：{liveInterimText || `請將手機靠近${langCfg.name}廣播或說話者...`}
                </div>
              )}

              {/* Quick Simulation / Manual Broadcast Input */}
              <div className="space-y-2 pt-1 border-t border-[#DDD7C9]">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={liveManualInput}
                    onChange={(e) => setLiveManualInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && liveManualInput.trim()) {
                        const txt = liveManualInput;
                        setLiveManualInput('');
                        void appendLiveSegment(txt);
                      }
                    }}
                    placeholder={`貼上或輸入聽到的${langCfg.name}廣播／長句...`}
                    className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#DDD7C9] text-xs text-[#2D251E]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!liveManualInput.trim()) return;
                      const txt = liveManualInput;
                      setLiveManualInput('');
                      void appendLiveSegment(txt);
                    }}
                    className="px-3 py-2 rounded-xl bg-[#C48E63] text-white text-xs font-black shrink-0"
                  >
                    加入字幕
                  </button>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-[11px] font-bold text-[#8A7E70] shrink-0">
                    📢 測試機場／電車廣播：
                  </span>
                  {langCfg.sampleVoicePrompts.foreign.map((sample, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => void appendLiveSegment(sample)}
                      className="px-2.5 py-1 rounded-full bg-[#EFECE4] hover:bg-[#F2CA62]/60 border border-[#DDD7C9] text-[11px] font-bold text-[#5C5044] shrink-0"
                    >
                      {sample.slice(0, 24)}...
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Live Subtitle Timeline Cards */}
            <section className="space-y-2.5">
              {vault.liveSubtitles.length === 0 ? (
                <div className="bg-[#FAF8F3] rounded-3xl border border-[#DDD7C9] p-6 text-center text-xs font-bold text-[#8A7E70]">
                  尚無廣播字幕紀錄，點上方「▶️ 開始連續收音」或點「📢 測試機場／電車廣播」體驗即時雙語字幕！
                </div>
              ) : (
                vault.liveSubtitles.map((seg) => {
                  const sCfg = LANGUAGES[seg.lang] || langCfg;
                  return (
                    <div
                      key={seg.id}
                      className="bg-[#FAF8F3] rounded-3xl border border-[#DDD7C9] p-3.5 shadow-card space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-black text-[#5C5044]">
                          {sCfg.flag} {sCfg.name}即時字幕 •{' '}
                          {new Date(seg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              speakTextTTS(seg.originalText, sCfg.bcp47, 0.9)
                            }
                            className="px-2 py-1 rounded-lg bg-[#EFECE4] text-[#2D251E] text-[11px] font-bold border border-[#DDD7C9]"
                          >
                            🔊 重聽原文
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const now = Date.now();
                              void commitVaultUpdate((prev) => ({
                                ...prev,
                                isUneditedDefault: false,
                                updatedAt: now,
                                liveSubtitles: prev.liveSubtitles.filter(
                                  (x) => x.id !== seg.id
                                ),
                                deletedIds: {
                                  ...prev.deletedIds,
                                  [seg.id]: now,
                                },
                              }));
                            }}
                            className="p-1 rounded-lg text-[#8A7E70] hover:text-[#C83D33]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-[#5C5044]">
                        {seg.originalText}
                      </div>
                      <div className="text-base font-black text-[#2D251E]">
                        {seg.translatedZh}
                      </div>

                      {seg.highlightKeywords && seg.highlightKeywords.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="text-[10px] font-black text-[#C83D33]">
                            🎯 關鍵資訊：
                          </span>
                          {seg.highlightKeywords.map((kw, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-full bg-[#F2CA62] text-[#2D251E] text-[11px] font-black border border-[#C48E63]"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </section>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: 📸 菜單點餐卡 (Real OCR + Point-to-Order Card)        */}
        {/* ========================================================= */}
        {activeTab === 'menu' && (
          <div className="space-y-3.5">
            <section className="bg-[#FAF8F3] rounded-3xl border border-[#DDD7C9] shadow-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-black text-[#2D251E]">
                    📸 實拍菜單 OCR 辨識翻譯 ＆ 店員指指點餐大字卡
                  </h3>
                  <p className="text-xs text-[#5C5044] mt-0.5">
                    1️⃣ 先選排版方向（**一般橫排** 或 **日本傳統直書縦書き**）➔ 2️⃣ 上傳或直接 `Ctrl+V` 貼上菜單照片，系統會真正掃描照片上的文字並逐道翻成中文！
                  </p>
                </div>
              </div>

              {/* Step 1: Menu Text Direction Selector (Horizontal vs Vertical Japanese) */}
              <div className="p-2.5 rounded-2xl bg-[#EFECE4] border border-[#DDD7C9] flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-black text-[#2D251E]">
                  🧭 照片文字排版方向：
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMenuOrientation('horizontal')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black border transition ${
                      menuOrientation === 'horizontal'
                        ? 'bg-[#1E3158] text-white border-[#1E3158]'
                        : 'bg-white text-[#5C5044] border-[#DDD7C9]'
                    }`}
                  >
                    ↔️ 橫排菜單（一般餐廳／洋食）
                  </button>
                  <button
                    type="button"
                    onClick={() => setMenuOrientation('vertical')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black border transition ${
                      menuOrientation === 'vertical'
                        ? 'bg-[#1E3158] text-white border-[#1E3158]'
                        : 'bg-white text-[#5C5044] border-[#DDD7C9]'
                    }`}
                  >
                    ↕️ 直書菜單（日本居酒屋／和食縦書き）
                  </button>
                </div>
              </div>

              {/* Real-time OCR Progress Bar */}
              {isAnalyzingMenu && (
                <div className="p-3.5 rounded-2xl bg-[#F2CA62]/30 border-2 border-[#C48E63] space-y-2">
                  <div className="flex items-center justify-between text-xs font-black text-[#2D251E]">
                    <span>{ocrStatusText || '🔍 正在掃描菜單圖片文字...'}</span>
                    <span>{ocrProgressPct}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-white overflow-hidden border border-[#DDD7C9]">
                    <div
                      className="h-full bg-[#C48E63] transition-all duration-300"
                      style={{ width: `${Math.max(8, ocrProgressPct)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons: Take Photo / Free Text Paste */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="cursor-pointer py-3 px-4 rounded-2xl bg-[#F2CA62] hover:bg-[#e9be50] text-[#2D251E] border-2 border-[#C48E63] font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition">
                  <Camera className="w-4 h-4" />
                  <span>
                    {isAnalyzingMenu
                      ? '🔍 正在掃描照片文字...'
                      : `📷 上傳／拍照${langCfg.name}菜單（支援 Ctrl+V 貼圖）`}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleUploadMenuPhoto(e)}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setShowFreeMenuInput((v) => !v)}
                  className="py-3 px-4 rounded-2xl bg-[#EFECE4] hover:bg-[#e3dfd5] text-[#2D251E] border border-[#DDD7C9] font-black text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition"
                >
                  <FileText className="w-4 h-4 text-[#C48E63]" />
                  <span>✍️ 檢視／貼上菜單文字批次翻譯</span>
                </button>
              </div>

              {showFreeMenuInput && (
                <div className="p-3 rounded-2xl bg-[#EFECE4] border border-[#DDD7C9] space-y-2">
                  <p className="text-xs font-bold text-[#5C5044]">
                    💡 您可直接修改下方 OCR 掃描出的外文菜名（或用 iPhone 相機「原況文字」複製貼上，一行一道菜，可附價格如 `親子丼 980`）：
                  </p>
                  <textarea
                    rows={4}
                    value={freeMenuPasteText}
                    onChange={(e) => setFreeMenuPasteText(e.target.value)}
                    placeholder={`例如：\n親子丼 980\n天ぷらうどん 1150\n生ビール 600`}
                    className="w-full p-2.5 rounded-xl bg-white border border-[#DDD7C9] text-xs text-[#2D251E] font-mono"
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowFreeMenuInput(false)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-[#DDD7C9] text-xs font-bold"
                    >
                      收起
                    </button>
                    <button
                      type="button"
                      disabled={isAnalyzingMenu || !freeMenuPasteText.trim()}
                      onClick={() => void handleParseFreeMenuLines(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#1E3158] text-white text-xs font-black"
                    >
                      覆蓋並重新翻譯整份菜單
                    </button>
                    <button
                      type="button"
                      disabled={isAnalyzingMenu || !freeMenuPasteText.trim()}
                      onClick={() => void handleParseFreeMenuLines(false)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#C48E63] text-white text-xs font-black"
                    >
                      ＋ 加到目前菜單
                    </button>
                  </div>
                </div>
              )}

              {/* 1-Tap Realistic Demo Menus */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                <span className="text-[11px] font-bold text-[#8A7E70] shrink-0">
                  🍱 測試內建範例菜單：
                </span>
                <button
                  type="button"
                  onClick={() => void handleLoadDemoMenu('ja_izakaya')}
                  className="px-2.5 py-1 rounded-full bg-[#EFECE4] hover:bg-[#F2CA62]/60 border border-[#DDD7C9] text-[11px] font-bold text-[#2D251E] shrink-0"
                >
                  🇯🇵 東京新宿居酒屋範例
                </button>
                <button
                  type="button"
                  onClick={() => void handleLoadDemoMenu('ko_bbq')}
                  className="px-2.5 py-1 rounded-full bg-[#EFECE4] hover:bg-[#F2CA62]/60 border border-[#DDD7C9] text-[11px] font-bold text-[#2D251E] shrink-0"
                >
                  🇰🇷 首爾弘大烤肉範例
                </button>
                <button
                  type="button"
                  onClick={() => void handleLoadDemoMenu('fr_bistro')}
                  className="px-2.5 py-1 rounded-full bg-[#EFECE4] hover:bg-[#F2CA62]/60 border border-[#DDD7C9] text-[11px] font-bold text-[#2D251E] shrink-0"
                >
                  🇫🇷 巴黎小酒館範例
                </button>
              </div>
            </section>

            {/* Active Menu Session Dish List & Cart */}
            {currentMenuSession ? (
              <section className="bg-[#FAF8F3] rounded-3xl border border-[#DDD7C9] shadow-card p-4 space-y-3.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm sm:text-base font-black text-[#2D251E]">
                        {currentMenuSession.title}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-[#EFECE4] border border-[#DDD7C9] text-[10px] font-black text-[#5C5044]">
                        {currentMenuSession.ocrEngine === 'gemini'
                          ? '✨ Gemini AI 視覺辨識'
                          : currentMenuSession.ocrEngine === 'tesseract-ocr'
                          ? `🔍 實拍光學 OCR (${
                              currentMenuSession.orientation === 'vertical'
                                ? '直書縦書き'
                                : '橫排'
                            })`
                          : currentMenuSession.ocrEngine === 'demo'
                          ? '🍱 內建範例菜單'
                          : '✍️ 文字批次翻譯'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8A7E70] mt-0.5">
                      點按菜名旁 `✏️` 可直接微調辨識文字；選好份數後點底部「🪧 生成店員指指點餐卡」
                    </p>
                  </div>

                  {vault.menuSessions.length > 1 && (
                    <select
                      value={currentMenuSession.id}
                      onChange={(e) => setActiveMenuId(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#EFECE4] border border-[#DDD7C9] text-xs font-bold text-[#2D251E]"
                    >
                      {vault.menuSessions.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Uploaded Menu Photo Preview + Re-scan Orientation / Region Crop Toolbar */}
                {currentMenuSession.photoThumb && (
                  <div className="p-3 rounded-2xl bg-[#EFECE4] border border-[#DDD7C9] space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-black text-[#2D251E]">
                        🖼️ 您上傳的菜單原圖（可切換直書／橫書或局部放大重掃）：
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFreeMenuPasteText(
                            currentMenuSession.items
                              .map(
                                (it) =>
                                  `${it.originalName}${
                                    it.priceForeign ? ` ${it.priceForeign}` : ''
                                  }`
                              )
                              .join('\n')
                          );
                          setShowFreeMenuInput(true);
                        }}
                        className="text-[11px] font-black text-[#C48E63] underline"
                      >
                        ✍️ 批次編輯所有辨識文字
                      </button>
                    </div>

                    <div className="max-h-56 overflow-hidden rounded-xl border border-[#DDD7C9] bg-white flex items-center justify-center">
                      <img
                        src={currentMenuSession.photoThumb}
                        alt="上傳的菜單照片"
                        className="max-h-56 w-auto object-contain"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isAnalyzingMenu}
                        onClick={() =>
                          void handleRescanCurrentPhoto('horizontal', 'full')
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-[#DDD7C9] text-[11px] font-black text-[#2D251E] hover:bg-[#F2CA62]/40"
                      >
                        ↔️ 以橫排文字重掃整張
                      </button>
                      <button
                        type="button"
                        disabled={isAnalyzingMenu}
                        onClick={() =>
                          void handleRescanCurrentPhoto('vertical', 'full')
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-[#C48E63] text-[11px] font-black text-[#2D251E] hover:bg-[#F2CA62]/40"
                      >
                        ↕️ 以日本直書（縦書き）重掃
                      </button>
                      <button
                        type="button"
                        disabled={isAnalyzingMenu}
                        onClick={() =>
                          void handleRescanCurrentPhoto(
                            currentMenuSession.orientation || menuOrientation,
                            'left'
                          )
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-[#DDD7C9] text-[11px] font-bold text-[#5C5044] flex items-center gap-1"
                      >
                        <Crop className="w-3 h-3" />
                        <span>只掃左半頁</span>
                      </button>
                      <button
                        type="button"
                        disabled={isAnalyzingMenu}
                        onClick={() =>
                          void handleRescanCurrentPhoto(
                            currentMenuSession.orientation || menuOrientation,
                            'right'
                          )
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-[#DDD7C9] text-[11px] font-bold text-[#5C5044] flex items-center gap-1"
                      >
                        <Crop className="w-3 h-3" />
                        <span>只掃右半頁</span>
                      </button>
                      <button
                        type="button"
                        disabled={isAnalyzingMenu}
                        onClick={() =>
                          void handleRescanCurrentPhoto(
                            currentMenuSession.orientation || menuOrientation,
                            'center'
                          )
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-[#DDD7C9] text-[11px] font-bold text-[#5C5044] flex items-center gap-1"
                      >
                        <Crop className="w-3 h-3" />
                        <span>去邊框掃中央</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Dietary & Order Notes Checkboxes */}
                <div className="space-y-1.5">
                  <span className="text-xs font-black text-[#5C5044]">
                    🌿 點餐客製化備註（會自動翻譯附在點餐卡上）：
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {DIETARY_ORDER_NOTES.map((note) => {
                      const checked = currentMenuSession.selectedNotes.includes(
                        note.id
                      );
                      return (
                        <button
                          key={note.id}
                          type="button"
                          onClick={() => void handleToggleMenuNote(note.id)}
                          className={`px-2.5 py-1 rounded-full text-xs font-bold border transition ${
                            checked
                              ? 'bg-[#1E3158] text-white border-[#1E3158]'
                              : 'bg-[#EFECE4] text-[#5C5044] border-[#DDD7C9]'
                          }`}
                        >
                          {checked ? '✓ ' : ''}
                          {note.zh}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dish Cards */}
                <div className="space-y-2">
                  {currentMenuSession.items.map((dish) => {
                    const mCfg = LANGUAGES[currentMenuSession.lang] || langCfg;
                    const rate =
                      vault.profile.customRatesToTwd?.[currentMenuSession.lang] ||
                      mCfg.defaultRateToTwd;
                    const twdPrice = dish.priceForeign
                      ? Math.round(dish.priceForeign * rate)
                      : null;
                    const isEditingDish = editingDishId === dish.id;

                    return (
                      <div
                        key={dish.id}
                        className={`p-3 rounded-2xl border transition space-y-2 ${
                          dish.quantity > 0
                            ? 'bg-[#F2CA62]/20 border-[#C48E63]'
                            : 'bg-white border-[#DDD7C9]'
                        }`}
                      >
                        {isEditingDish ? (
                          <div className="space-y-2">
                            <div className="text-[11px] font-black text-[#5C5044]">
                              ✏️ 修改外文菜名／中文翻譯／外幣金額（中文留空將自動重翻）：
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                              <input
                                type="text"
                                value={editingDishOrig}
                                onChange={(e) => setEditingDishOrig(e.target.value)}
                                placeholder="外文原名"
                                className="px-2.5 py-1.5 rounded-xl bg-[#FAF8F3] border border-[#DDD7C9] text-xs font-bold"
                              />
                              <input
                                type="text"
                                value={editingDishZh}
                                onChange={(e) => setEditingDishZh(e.target.value)}
                                placeholder="中文翻譯（留空自動重翻）"
                                className="px-2.5 py-1.5 rounded-xl bg-[#FAF8F3] border border-[#DDD7C9] text-xs"
                              />
                              <input
                                type="number"
                                value={editingDishPrice}
                                onChange={(e) => setEditingDishPrice(e.target.value)}
                                placeholder="外幣金額（選填）"
                                className="px-2.5 py-1.5 rounded-xl bg-[#FAF8F3] border border-[#DDD7C9] text-xs"
                              />
                            </div>
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingDishId(null)}
                                className="px-2.5 py-1 rounded-lg bg-[#EFECE4] text-xs font-bold"
                              >
                                取消
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleSaveInlineDishEdit(dish.id)}
                                className="px-3 py-1 rounded-lg bg-[#C48E63] text-white text-xs font-black"
                              >
                                儲存更新
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-black text-[#2D251E]">
                                  {dish.translatedZh}
                                </span>
                                {dish.dietaryWarning && (
                                  <span className="px-2 py-0.5 rounded-full bg-[#C83D33]/15 text-[#C83D33] text-[10px] font-black">
                                    {dish.dietaryWarning}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-bold text-[#5C5044]">
                                原文：{dish.originalName}
                              </div>
                              {dish.descriptionZh && (
                                <div className="text-[11px] text-[#8A7E70]">
                                  {dish.descriptionZh}
                                </div>
                              )}
                              <div className="flex items-center gap-2.5 pt-0.5 flex-wrap">
                                {dish.priceForeign !== undefined && (
                                  <span className="text-xs font-black text-[#C48E63]">
                                    {mCfg.currencySymbol}
                                    {dish.priceForeign.toLocaleString()}（約 NT$
                                    {twdPrice?.toLocaleString()}）
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    speakTextTTS(
                                      dish.originalName,
                                      mCfg.bcp47,
                                      0.9
                                    )
                                  }
                                  className="text-[11px] font-bold text-[#5C5044] underline"
                                >
                                  🔊 聽發音
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDishId(dish.id);
                                    setEditingDishOrig(dish.originalName);
                                    setEditingDishZh(dish.translatedZh);
                                    setEditingDishPrice(
                                      dish.priceForeign ? String(dish.priceForeign) : ''
                                    );
                                  }}
                                  className="text-[11px] font-bold text-[#8A7E70] hover:text-[#2D251E] inline-flex items-center gap-0.5"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>改字</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteDishItem(dish.id)}
                                  className="text-[11px] font-bold text-[#8A7E70] hover:text-[#C83D33]"
                                >
                                  刪除
                                </button>
                              </div>
                            </div>

                            {/* Quantity Stepper */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => void handleUpdateDishQty(dish.id, -1)}
                                className="w-8 h-8 rounded-xl bg-[#EFECE4] border border-[#DDD7C9] flex items-center justify-center text-[#2D251E] font-black active:scale-95"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-6 text-center text-sm font-black text-[#2D251E]">
                                {dish.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => void handleUpdateDishQty(dish.id, 1)}
                                className="w-8 h-8 rounded-xl bg-[#F2CA62] border border-[#C48E63] flex items-center justify-center text-[#2D251E] font-black active:scale-95"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Sticky Point-to-Order Trigger Bar */}
                <div className="p-3.5 rounded-2xl bg-[#1E3158] text-white flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-white/80">
                      已選 {selectedMenuDishes.reduce((a, b) => a + b.quantity, 0)} 份餐點
                    </div>
                    {selectedMenuTotalForeign > 0 && (
                      <div className="text-sm font-black text-[#F2CA62]">
                        預估合計：
                        {LANGUAGES[currentMenuSession.lang].currencySymbol}
                        {selectedMenuTotalForeign.toLocaleString()}（約 NT$
                        {Math.round(
                          selectedMenuTotalForeign *
                            (vault.profile.customRatesToTwd?.[
                              currentMenuSession.lang
                            ] ||
                              LANGUAGES[currentMenuSession.lang].defaultRateToTwd)
                        ).toLocaleString()}
                        ）
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={selectedMenuDishes.length === 0}
                    onClick={() => setShowOrderCardModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#F2CA62] disabled:opacity-40 text-[#2D251E] text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>🪧 生成店員指指點餐卡</span>
                  </button>
                </div>
              </section>
            ) : (
              <div className="bg-[#FAF8F3] rounded-3xl border border-[#DDD7C9] p-6 text-center space-y-3">
                <p className="text-sm font-bold text-[#5C5044]">
                  上傳或直接 `Ctrl+V` 貼上任何日文／韓文／英文菜單照片，系統就會自動執行光學文字辨識 (OCR) 並翻成中文點餐卡！
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: 🪧 離線手指卡 (100% Offline Survival Phrasebook)     */}
        {/* ========================================================= */}
        {activeTab === 'phrasebook' && (
          <div className="space-y-3.5">
            <section className="bg-[#FAF8F3] rounded-3xl border border-[#DDD7C9] shadow-card p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="text-base font-black text-[#2D251E]">
                    🪧 100% 離線手指大字卡 ＆ 旅遊空耳句庫
                  </h3>
                  <p className="text-xs text-[#5C5044]">
                    地鐵、地下室或飛機上沒網路也能直接放大秀給店員／司機看，並附台灣人秒懂空耳發音！
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#F2CA62] text-[#2D251E] border border-[#C48E63] text-xs font-black flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新增我的專屬小卡</span>
                </button>
              </div>

              {/* Search Phrase Bar */}
              <input
                type="text"
                value={phraseSearch}
                onChange={(e) => setPhraseSearch(e.target.value)}
                placeholder="🔍 搜尋情境句（如：退稅、去冰、香菜、寄放行李、計程車、頭痛）..."
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#DDD7C9] text-xs text-[#2D251E]"
              />

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {PHRASE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 border transition ${
                      selectedCategory === cat.id
                        ? 'bg-[#1E3158] text-white border-[#1E3158]'
                        : 'bg-[#EFECE4] text-[#5C5044] border-[#DDD7C9]'
                    }`}
                  >
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Phrase Cards List */}
            <section className="space-y-2.5">
              {selectedCategory === 'custom' ? (
                displayCustomPhrases.length === 0 ? (
                  <div className="bg-[#FAF8F3] rounded-3xl border border-[#DDD7C9] p-6 text-center text-xs font-bold text-[#8A7E70]">
                    還沒有自訂小卡，點上方「＋ 新增我的專屬小卡」先把飯店地址或個人忌口存起來吧！
                  </div>
                ) : (
                  displayCustomPhrases
                    .filter(
                      (c) =>
                        !phraseSearch.trim() ||
                        c.zhText.includes(phraseSearch.trim()) ||
                        c.foreignText.includes(phraseSearch.trim())
                    )
                    .map((card) => {
                      const cCfg = LANGUAGES[card.lang] || langCfg;
                      return (
                        <div
                          key={card.id}
                          className="bg-[#FAF8F3] rounded-3xl border-2 border-[#C48E63] p-4 shadow-card space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#F2CA62] text-[#2D251E] text-[11px] font-black">
                              ⭐ 我的專屬小卡 ({cCfg.flag} {cCfg.name})
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setJumboCard({
                                    titleZh: card.zhText,
                                    foreignText: card.foreignText,
                                    romanization: card.romanization,
                                    phoneticHint: card.phoneticHint,
                                    lang: card.lang,
                                  })
                                }
                                className="px-2.5 py-1 rounded-xl bg-[#1E3158] text-white text-xs font-black flex items-center gap-1"
                              >
                                <Maximize2 className="w-3 h-3" />
                                <span>放大秀卡</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeleteCustomPhrase(card.id)
                                }
                                className="p-1.5 rounded-xl text-[#8A7E70] hover:text-[#C83D33]"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="text-xs font-bold text-[#5C5044]">
                            {card.zhText}
                          </div>
                          <div className="text-lg font-black text-[#2D251E]">
                            {card.foreignText}
                          </div>
                          {card.phoneticHint && (
                            <div className="text-xs font-bold text-[#2D251E] bg-[#EFECE4] px-2.5 py-1 rounded-xl border border-[#DDD7C9]">
                              🗣️ 空耳發音：{card.phoneticHint}
                            </div>
                          )}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() =>
                                speakTextTTS(card.foreignText, cCfg.bcp47, 0.95)
                              }
                              className="px-3 py-1.5 rounded-xl bg-[#F2CA62] text-[#2D251E] text-xs font-black border border-[#C48E63]"
                            >
                              🔊 朗讀{cCfg.name}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                speakTextTTS(card.foreignText, cCfg.bcp47, 0.7)
                              }
                              className="px-2.5 py-1.5 rounded-xl bg-white text-[#5C5044] text-xs font-bold border border-[#DDD7C9]"
                            >
                              🐢 0.7x 慢速
                            </button>
                          </div>
                        </div>
                      );
                    })
                )
              ) : (
                BUILTIN_SURVIVAL_PHRASES.filter((item) => {
                  if (phraseSearch.trim()) {
                    const q = phraseSearch.trim().toLowerCase();
                    const tr = item.translations[activeLang];
                    return (
                      item.zhText.toLowerCase().includes(q) ||
                      tr.text.toLowerCase().includes(q) ||
                      tr.phoneticHint.toLowerCase().includes(q)
                    );
                  }
                  return item.category === selectedCategory;
                }).map((item) => {
                  const tr = item.translations[activeLang];
                  return (
                    <div
                      key={item.id}
                      className="bg-[#FAF8F3] rounded-3xl border border-[#DDD7C9] p-4 shadow-card space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-[#5C5044]">
                          🇹🇼 {item.zhText}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setJumboCard({
                              titleZh: item.zhText,
                              foreignText: tr.text,
                              romanization: tr.romanization,
                              phoneticHint: tr.phoneticHint,
                              lang: activeLang,
                            })
                          }
                          className="px-2.5 py-1 rounded-xl bg-[#1E3158] text-white text-xs font-black shrink-0 flex items-center gap-1 active:scale-95"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>全螢幕秀卡</span>
                        </button>
                      </div>

                      <div className="text-lg sm:text-xl font-black text-[#2D251E] leading-snug">
                        {tr.text}
                      </div>
                      <div className="text-xs text-[#5C5044]">
                        🔤 {tr.romanization}
                      </div>
                      <div className="text-xs font-bold text-[#2D251E] bg-[#EFECE4] px-2.5 py-1.5 rounded-xl border border-[#DDD7C9]">
                        🗣️ 台灣空耳：{tr.phoneticHint}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            speakTextTTS(tr.text, langCfg.bcp47, 0.95)
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F2CA62] text-[#2D251E] text-xs font-black border border-[#C48E63]"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>🔊 正常朗讀</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            speakTextTTS(tr.text, langCfg.bcp47, 0.7)
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white text-[#5C5044] text-xs font-bold border border-[#DDD7C9]"
                        >
                          <span>🐢 0.7x 慢速跟讀</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: 💴 匯率退稅算 (Voice Price & Tax-Free Calculator)    */}
        {/* ========================================================= */}
        {activeTab === 'calc' && (
          <div className="space-y-3.5">
            <section className="bg-[#FAF8F3] rounded-3xl border border-[#DDD7C9] shadow-card p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="text-base font-black text-[#2D251E]">
                    💴 {langCfg.flag} {langCfg.currencyName}（{langCfg.currencyCode}）秒換算台幣 ＆ 免稅湊單
                  </h3>
                  <p className="text-xs text-[#5C5044]">
                    目前匯率：1 {langCfg.currencyCode} ≈ NT$ {activeRateToTwd}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isUpdatingRates}
                  onClick={() => void handleRefreshLiveRates()}
                  className="px-3 py-1.5 rounded-xl bg-[#EFECE4] border border-[#DDD7C9] text-xs font-bold text-[#2D251E] flex items-center gap-1"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      isUpdatingRates ? 'animate-spin' : ''
                    }`}
                  />
                  <span>更新即時匯率</span>
                </button>
              </div>

              {/* Price Input + Voice Price Recognition */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#EFECE4] border border-[#DDD7C9] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#5C5044]">
                      {langCfg.flag} 外幣標價（{langCfg.currencyCode}）
                    </span>
                    <button
                      type="button"
                      onClick={handleVoicePriceInput}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-black flex items-center gap-1 ${
                        isListeningPrice
                          ? 'bg-[#C83D33] text-white'
                          : 'bg-[#F2CA62] text-[#2D251E]'
                      }`}
                    >
                      <Mic className="w-3 h-3" />
                      <span>{isListeningPrice ? '請念出數字...' : '念標價換算'}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-black text-[#5C5044]">
                      {langCfg.currencySymbol}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={calcAmountStr}
                      onChange={(e) => setCalcAmountStr(e.target.value)}
                      className="w-full bg-white px-3 py-2 rounded-xl border border-[#DDD7C9] text-xl font-black text-[#2D251E]"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F2CA62]/30 border-2 border-[#C48E63] flex flex-col justify-between">
                  <span className="text-xs font-black text-[#5C5044]">
                    🇹🇼 折合新台幣（TWD）
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-[#2D251E]">
                    NT$ {calcTwd.toLocaleString()}
                  </div>
                  <div className="text-[11px] font-bold text-[#5C5044]">
                    退稅後約省 NT$ {Math.round(calcTwd * (langCfg.taxFreeRatePct / (100 + langCfg.taxFreeRatePct))).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Tax-Free Threshold Progress Meter */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#DDD7C9] space-y-2">
                <div className="flex items-center justify-between text-xs font-black">
                  <span>🛂 {langCfg.countryName}免稅門檻湊單進度（含下方血拚清單）</span>
                  <span className="text-[#C48E63]">
                    {langCfg.currencySymbol}
                    {combinedTaxFreeForeign.toLocaleString()} / {langCfg.currencySymbol}
                    {langCfg.taxFreeThreshold.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-[#EFECE4] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      taxFreeProgressPct >= 100 ? 'bg-emerald-600' : 'bg-[#F2CA62]'
                    }`}
                    style={{ width: `${taxFreeProgressPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  {combinedTaxFreeForeign >= langCfg.taxFreeThreshold ? (
                    <span className="text-emerald-700 font-black">
                      🎉 已達免稅門檻！預估可退 {langCfg.currencySymbol}
                      {taxRefundForeign.toLocaleString()}（約 NT$ {taxRefundTwd.toLocaleString()}）
                    </span>
                  ) : (
                    <span className="text-[#5C5044]">
                      還差{' '}
                      <strong className="text-[#C83D33]">
                        {langCfg.currencySymbol}
                        {(langCfg.taxFreeThreshold - combinedTaxFreeForeign).toLocaleString()}
                      </strong>
                      （約 NT${' '}
                      {Math.round(
                        (langCfg.taxFreeThreshold - combinedTaxFreeForeign) *
                          activeRateToTwd
                      ).toLocaleString()}
                      ）即可辦理退稅！
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#8A7E70]">{langCfg.taxFreeTip}</p>
              </div>

              {/* Add to Today's Shopping List */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={calcItemTitle}
                  onChange={(e) => setCalcItemTitle(e.target.value)}
                  placeholder="輸入戰利品名稱（如：藥妝店面膜、Uniqlo 外套）..."
                  className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#DDD7C9] text-xs text-[#2D251E]"
                />
                <button
                  type="button"
                  onClick={() => void handleAddShoppingItem()}
                  className="px-3.5 py-2 rounded-xl bg-[#1E3158] text-white text-xs font-black shrink-0"
                >
                  ＋ 加入湊單清單
                </button>
              </div>
            </section>

            {/* Shopping List Items */}
            {vault.shoppingItems.length > 0 && (
              <section className="bg-[#FAF8F3] rounded-3xl border border-[#DDD7C9] shadow-card p-4 space-y-2">
                <h4 className="text-xs font-black text-[#5C5044]">
                  🛍️ 今日血拚退稅湊單清單（{vault.shoppingItems.length} 件）
                </h4>
                {vault.shoppingItems.map((item) => {
                  const iCfg = LANGUAGES[item.lang] || langCfg;
                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-2xl bg-white border border-[#DDD7C9] flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="text-xs font-black text-[#2D251E]">
                          {iCfg.flag} {item.title}
                        </div>
                        <div className="text-[11px] font-bold text-[#5C5044]">
                          {iCfg.currencySymbol}
                          {item.amountForeign.toLocaleString()} ≈ NT${' '}
                          {item.amountTwd.toLocaleString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteShoppingItem(item.id)}
                        className="p-1.5 text-[#8A7E70] hover:text-[#C83D33]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </section>
            )}
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* Bottom Mobile Navigation Bar (5 Tabs)                      */}
      {/* ========================================================= */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-[#FAF8F3]/95 backdrop-blur-md border-t border-[#DDD7C9] px-2 py-1.5">
        <div className="max-w-xl mx-auto grid grid-cols-5 gap-1">
          {(
            [
              { id: 'talk', label: '雙向對講', icon: Mic },
              { id: 'live', label: '隨身字幕', icon: Radio },
              { id: 'menu', label: '菜單點餐', icon: Camera },
              { id: 'phrasebook', label: '離線手指卡', icon: BookOpen },
              { id: 'calc', label: '匯率退稅', icon: Calculator },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-1.5 px-1 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition ${
                  active
                    ? 'bg-[#F2CA62] text-[#2D251E] font-black shadow-sm'
                    : 'text-[#5C5044] hover:bg-[#EFECE4] font-bold'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[11px] leading-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ========================================================= */}
      {/* MODAL 1: 🪧 全螢幕高對比店員指指大字秀卡 (Jumbo Show Card)  */}
      {/* ========================================================= */}
      {jumboCard && (
        <div className="fixed inset-0 z-50 bg-[#2D251E]/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF8F3] w-full max-w-lg rounded-3xl border-4 border-[#F2CA62] shadow-pop overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#EFECE4] px-4 py-3 border-b border-[#DDD7C9] flex items-center justify-between gap-2">
              <span className="text-xs font-black text-[#5C5044]">
                🪧 全螢幕手指大字卡（{LANGUAGES[jumboCard.lang].flag}{' '}
                {LANGUAGES[jumboCard.lang].name}）
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setJumboCard((prev) =>
                      prev ? { ...prev, flipped: !prev.flipped } : null
                    )
                  }
                  className="px-2.5 py-1 rounded-full bg-white border border-[#DDD7C9] text-xs font-bold text-[#2D251E] flex items-center gap-1"
                >
                  <FlipVertical2 className="w-3.5 h-3.5" />
                  <span>180° 翻轉</span>
                </button>
                <button
                  type="button"
                  onClick={() => setJumboCard(null)}
                  className="p-1.5 rounded-full bg-[#2D251E] text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              className={`p-6 overflow-y-auto space-y-4 text-center transition-transform duration-300 ${
                jumboCard.flipped ? 'rotate-180' : ''
              }`}
            >
              <div className="text-xs font-bold text-[#8A7E70]">
                🇹🇼 我想表達：{jumboCard.titleZh}
              </div>
              <div className="text-2xl sm:text-4xl font-black text-[#2D251E] leading-snug break-words py-2">
                {jumboCard.foreignText}
              </div>
              {jumboCard.backTranslatedText && (
                <div className="inline-block px-3 py-1.5 rounded-xl bg-emerald-950/5 border border-emerald-700/30 text-xs font-bold text-emerald-900">
                  ✅ 雙向回譯核對：「{jumboCard.backTranslatedText}」
                </div>
              )}
              {jumboCard.romanization && (
                <div className="text-sm font-semibold text-[#5C5044]">
                  🔤 {jumboCard.romanization}
                </div>
              )}
              {jumboCard.phoneticHint && (
                <div className="inline-block px-3.5 py-2 rounded-2xl bg-[#EFECE4] border border-[#DDD7C9] text-sm font-black text-[#2D251E]">
                  🗣️ 空耳發音：{jumboCard.phoneticHint}
                </div>
              )}
            </div>

            <div className="p-4 bg-[#EFECE4] border-t border-[#DDD7C9] grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  speakTextTTS(
                    jumboCard.foreignText,
                    LANGUAGES[jumboCard.lang].bcp47,
                    0.95
                  )
                }
                className="py-3 px-4 rounded-2xl bg-[#F2CA62] text-[#2D251E] border-2 border-[#C48E63] text-sm font-black flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Volume2 className="w-4 h-4" />
                <span>🔊 正常語速朗讀</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  speakTextTTS(
                    jumboCard.foreignText,
                    LANGUAGES[jumboCard.lang].bcp47,
                    0.68
                  )
                }
                className="py-3 px-4 rounded-2xl bg-white text-[#2D251E] border border-[#DDD7C9] text-sm font-black flex items-center justify-center gap-1.5"
              >
                <span>🐢 0.7x 慢速清晰朗讀</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: 🛒 店員指指點餐大字卡 (Point-to-Order Card Modal)  */}
      {/* ========================================================= */}
      {showOrderCardModal && currentMenuSession && (
        <div className="fixed inset-0 z-50 bg-[#2D251E]/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF8F3] w-full max-w-lg rounded-3xl border-4 border-[#F2CA62] shadow-pop overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#1E3158] text-white px-4 py-3 flex items-center justify-between">
              <span className="text-xs sm:text-sm font-black">
                🪧 請直接把這張畫面拿給店員看（
                {LANGUAGES[currentMenuSession.lang].flag}{' '}
                {LANGUAGES[currentMenuSession.lang].name}點餐卡）
              </span>
              <button
                type="button"
                onClick={() => setShowOrderCardModal(false)}
                className="p-1 rounded-full bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="text-base sm:text-lg font-black text-[#2D251E]">
                {LANGUAGES[currentMenuSession.lang].orderGreeting}
              </div>

              <div className="space-y-2.5">
                {selectedMenuDishes.map((dish) => (
                  <div
                    key={dish.id}
                    className="p-3 rounded-2xl bg-white border-2 border-[#DDD7C9] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-base sm:text-lg font-black text-[#2D251E]">
                        {dish.originalName}
                      </div>
                      <div className="text-xs font-bold text-[#8A7E70]">
                        （{dish.translatedZh}）
                      </div>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-[#F2CA62] text-[#2D251E] text-lg font-black shrink-0 border border-[#C48E63]">
                      × {dish.quantity}
                    </div>
                  </div>
                ))}
              </div>

              {currentMenuSession.selectedNotes.length > 0 && (
                <div className="p-3 rounded-2xl bg-[#EFECE4] border border-[#C48E63] space-y-1">
                  <div className="text-xs font-black text-[#C83D33]">
                    📌 飲食忌口與客製化備註：
                  </div>
                  {currentMenuSession.selectedNotes.map((noteId) => {
                    const found = DIETARY_ORDER_NOTES.find(
                      (n) => n.id === noteId
                    );
                    if (!found) return null;
                    return (
                      <div key={noteId} className="text-sm font-black text-[#2D251E]">
                        • {found.translations[currentMenuSession.lang]}
                        <span className="text-xs text-[#8A7E70] ml-1">
                          ({found.zh})
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="text-sm font-black text-[#5C5044]">
                {LANGUAGES[currentMenuSession.lang].orderOutro}
              </div>
            </div>

            <div className="p-4 bg-[#EFECE4] border-t border-[#DDD7C9] flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const mCfg = LANGUAGES[currentMenuSession.lang];
                  const dishLines = selectedMenuDishes
                    .map((d) => `${d.originalName}、${d.quantity}つ`)
                    .join('。 ');
                  const notesLine = currentMenuSession.selectedNotes
                    .map(
                      (nId) =>
                        DIETARY_ORDER_NOTES.find((n) => n.id === nId)?.translations[
                          currentMenuSession.lang
                        ] || ''
                    )
                    .filter(Boolean)
                    .join('。 ');
                  speakTextTTS(
                    `${mCfg.orderGreeting} ${dishLines}。 ${notesLine} ${mCfg.orderOutro}`,
                    mCfg.bcp47,
                    0.9
                  );
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#F2CA62] text-[#2D251E] border-2 border-[#C48E63] text-sm font-black flex items-center justify-center gap-2 shadow-sm"
              >
                <Volume2 className="w-4 h-4" />
                <span>
                  🔊 用{LANGUAGES[currentMenuSession.lang].name}整單念給店員聽
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ＋ 新增我的專屬離線小卡 (Add Custom Card Modal)    */}
      {/* ========================================================= */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 bg-[#2D251E]/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF8F3] w-full max-w-md rounded-3xl border border-[#DDD7C9] shadow-pop p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#2D251E]">
                ⭐ 新增我的專屬離線手指卡（{langCfg.flag} {langCfg.name}）
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCustomModal(false)}
                className="p-1 text-[#5C5044]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-black text-[#5C5044] mb-1">
                  1. 中文內容（如：飯店地址、我不吃花生、請載我到東京鐵塔）*
                </label>
                <input
                  type="text"
                  value={newCustomZh}
                  onChange={(e) => setNewCustomZh(e.target.value)}
                  placeholder="輸入中文，若下方外文留空會自動幫妳翻譯！"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#DDD7C9] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#5C5044] mb-1">
                  2. 對應{langCfg.name}（選填，留空即自動翻譯）
                </label>
                <input
                  type="text"
                  value={newCustomForeign}
                  onChange={(e) => setNewCustomForeign(e.target.value)}
                  placeholder="可直接貼上訂房網上的當地飯店地址或留空自動翻譯"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#DDD7C9] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#5C5044] mb-1">
                  3. 空耳發音或備註（選填）
                </label>
                <input
                  type="text"
                  value={newCustomPhonetic}
                  onChange={(e) => setNewCustomPhonetic(e.target.value)}
                  placeholder="例如：溫天修桑，口弄 Hotel 媽得 歐內嘎伊希媽斯"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#DDD7C9] text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCustomModal(false)}
                className="px-3.5 py-2 rounded-xl bg-[#EFECE4] text-xs font-bold"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleAddCustomPhrase()}
                className="px-4 py-2 rounded-xl bg-[#F2CA62] text-[#2D251E] border border-[#C48E63] text-xs font-black"
              >
                儲存專屬小卡
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: 🔐 雲端同步保險箱 ＆ Gemini AI 大腦設定 Modal       */}
      {/* ========================================================= */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-[#2D251E]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF8F3] w-full max-w-lg rounded-3xl border border-[#DDD7C9] shadow-pop overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#EFECE4] px-4 py-3 border-b border-[#DDD7C9] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#C48E63]" />
                <span className="text-sm font-black text-[#2D251E]">
                  🔐 跨裝置雲端保險箱 ＆ AI 語音大腦設定
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-full text-[#5C5044]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Section 1: Passcode Vault Sync */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#DDD7C9] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-[#2D251E] text-sm">
                    1. Safari ↔ iPhone「加入主畫面」雲端同步通行碼
                  </span>
                  {fingerprintBadge && (
                    <span className="px-2 py-0.5 rounded-full bg-[#F2CA62] text-[#2D251E] text-[11px] font-black">
                      雲端印記 {fingerprintBadge}
                    </span>
                  )}
                </div>
                <p className="text-[#5C5044] leading-relaxed">
                  在電腦、iPhone Safari 與「加入主畫面 App」輸入**同一組自訂通行碼**，您的對話紀錄、專屬飯店地址卡、菜單與加密後的 Gemini Key 就會以 `AES-GCM` 點對點加密自動同步！
                </p>

                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type={showPasscodePlain ? 'text' : 'password'}
                      value={passcodeInput}
                      onChange={(e) => setPasscodeInput(e.target.value)}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="輸入自訂通行碼以綁定跨裝置雲端保險箱..."
                      className="w-full pl-3 pr-9 py-2 rounded-xl bg-[#FAF8F3] border border-[#DDD7C9] text-xs font-bold text-[#2D251E]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasscodePlain((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A7E70]"
                      aria-label="顯示或隱藏通行碼"
                    >
                      {showPasscodePlain ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleBindPasscode()}
                    className="px-3.5 py-2 rounded-xl bg-[#F2CA62] text-[#2D251E] border border-[#C48E63] font-black shrink-0"
                  >
                    綁定並同步
                  </button>
                </div>
              </div>

              {/* Section 2: Optional BYOK Gemini API Key (Encrypted in Vault) */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#DDD7C9] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-[#2D251E] text-sm flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-[#C48E63]" />
                    <span>2. 選配進階 AI 大腦（自帶 Gemini API Key）</span>
                  </span>
                  <span className="text-[11px] font-bold text-[#8A7E70]">
                    零程式碼外洩・跟隨通行碼加密同步
                  </span>
                </div>
                <p className="text-[#5C5044] leading-relaxed">
                  不填 Key 即內建「免Key光學菜單 OCR ＋ Google 雙向回譯驗算」！若填入您的免費 Google AI Studio `Gemini API Key`，可進一步解鎖**手寫書法／複雜排版菜單 AI 視覺辨識、高抗噪原生錄音聽寫、與道地敬語空耳教學**。
                </p>

                <div className="relative">
                  <input
                    type={showGeminiKeyPlain ? 'text' : 'password'}
                    value={vault.profile.geminiApiKey || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      void commitVaultUpdate((prev) => ({
                        ...prev,
                        isUneditedDefault: false,
                        updatedAt: Date.now(),
                        settingsUpdatedAt: Date.now(),
                        profile: {
                          ...prev.profile,
                          geminiApiKey: val,
                        },
                      }));
                    }}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="選填：貼上 AIzaSy... 開頭的 Gemini API Key（將由通行碼加密保護）"
                    className="w-full pl-3 pr-9 py-2 rounded-xl bg-[#FAF8F3] border border-[#DDD7C9] text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKeyPlain((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A7E70]"
                  >
                    {showGeminiKeyPlain ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Section 3: Backup JSON Export/Import & Local History Snapshots Rescue */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#DDD7C9] space-y-2.5">
                <span className="font-black text-[#2D251E] text-sm block">
                  3. 本機歷史快照救援 ＆ JSON 備份檔下載
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => exportVaultBackupJson(vault)}
                    className="px-3 py-2 rounded-xl bg-[#EFECE4] border border-[#DDD7C9] font-bold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>下載 .json 備份檔</span>
                  </button>
                  <label className="cursor-pointer px-3 py-2 rounded-xl bg-[#EFECE4] border border-[#DDD7C9] font-bold flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>匯入 .json 備份檔</span>
                    <input
                      type="file"
                      accept="application/json,.json"
                      onChange={handleImportJsonFile}
                      className="hidden"
                    />
                  </label>
                </div>

                {historySnapshots.length > 0 && (
                  <div className="pt-2 space-y-1.5">
                    <div className="text-[11px] font-black text-[#5C5044] flex items-center gap-1">
                      <History className="w-3.5 h-3.5" />
                      <span>🛟 本機 IndexedDB 自動滾動快照救援：</span>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {historySnapshots.map((snap) => (
                        <div
                          key={snap.id}
                          className="p-2 rounded-xl bg-[#FAF8F3] border border-[#DDD7C9] flex items-center justify-between gap-2"
                        >
                          <span className="text-[11px] text-[#5C5044]">
                            {new Date(snap.savedAt).toLocaleString()}（對話{' '}
                            {snap.dialogueCount}・小卡 {snap.phraseCount}・菜單{' '}
                            {snap.menuCount}）
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleRestoreSnapshot(snap)}
                            className="px-2.5 py-1 rounded-lg bg-[#F2CA62] text-[#2D251E] text-[11px] font-black"
                          >
                            救援合併
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
