export type LanguageCode = 'ja' | 'ko' | 'en' | 'th' | 'vi' | 'fr' | 'es' | 'de';

export type TranslationTone = 'polite' | 'concise' | 'casual';

export type PhraseCategory =
  | 'custom'
  | 'dining'
  | 'shopping'
  | 'transport'
  | 'hotel'
  | 'pharmacy'
  | 'social'
  | 'emergency';

export interface LanguageConfig {
  code: LanguageCode;
  name: string;
  countryName: string;
  flag: string;
  bcp47: string;
  currencyCode: string;
  currencySymbol: string;
  currencyName: string;
  defaultRateToTwd: number;
  taxFreeThreshold: number;
  taxFreeRatePct: number;
  taxFreeTip: string;
  orderGreeting: string;
  orderOutro: string;
  sampleVoicePrompts: {
    zh: string[];
    foreign: string[];
  };
}

export interface WordBreakdownItem {
  term: string;
  meaning: string;
  pronunciation?: string;
}

export interface DialogueTurn {
  id: string;
  speaker: 'me' | 'partner';
  targetLang: LanguageCode;
  sourceText: string;
  translatedText: string;
  romanization?: string;
  phoneticHint?: string;
  culturalTip?: string;
  /** 獨立雙向回譯驗算（把翻譯出的外文再逆向直譯回中文，確認語意 100% 沒跑掉） */
  backTranslatedText?: string;
  /** 語意吻合度信心分數 (0~100) */
  confidenceScore?: number;
  /** 關鍵詞彙拆解對照（如：[2つ = 2份] [ネギ抜き = 不要蔥]） */
  wordBreakdowns?: WordBreakdownItem[];
  /** 另一種超直白短句替換說法 */
  alternativeText?: string;
  engine: 'builtin' | 'gemini' | 'offline';
  starred?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface LiveSubtitleSegment {
  id: string;
  lang: LanguageCode;
  originalText: string;
  translatedZh: string;
  romanization?: string;
  highlightKeywords?: string[];
  starred?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface MenuDishItem {
  id: string;
  originalName: string;
  translatedZh: string;
  romanization?: string;
  descriptionZh?: string;
  priceForeign?: number;
  dietaryWarning?: string;
  quantity: number;
}

export interface MenuScanSession {
  id: string;
  title: string;
  lang: LanguageCode;
  photoThumb?: string;
  hasLocalHiResPhoto?: boolean;
  ocrEngine?: 'gemini' | 'gemini-search' | 'restaurant-search' | 'tesseract-ocr' | 'manual' | 'demo';
  orientation?: 'horizontal' | 'vertical';
  addressNote?: string;
  googleMapsUrl?: string;
  localFoodPortalUrl?: string;
  officialUrl?: string;
  fullTranslatedSummaryZh?: string;
  customNoteZh?: string;
  customNoteForeign?: string;
  customNotePhonetic?: string;
  items: MenuDishItem[];
  selectedNotes: string[];
  createdAt: number;
  updatedAt: number;
}

export interface CustomPhraseCard {
  id: string;
  category: PhraseCategory;
  lang: LanguageCode;
  zhText: string;
  foreignText: string;
  romanization?: string;
  phoneticHint?: string;
  note?: string;
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ShoppingCalcItem {
  id: string;
  title: string;
  lang: LanguageCode;
  amountForeign: number;
  amountTwd: number;
  createdAt: number;
  updatedAt: number;
}

export interface TravelProfile {
  nickname: string;
  activeLang: LanguageCode;
  preferredTone: TranslationTone;
  speechRate: number;
  autoSpeakTranslation: boolean;
  faceToFaceFlipped: boolean;
  /** 語音聽寫後是否先停留在輸入框讓使用者確認文字再送出翻譯 */
  confirmTranscriptBeforeSend?: boolean;
  customRatesToTwd: Partial<Record<LanguageCode, number>>;
  geminiApiKey?: string;
  geminiModel?: string;
  hotelAddressCardZh?: string;
  hotelAddressCardForeign?: string;
  dietaryAlertZh?: string;
  dietaryAlertForeign?: string;
}

export interface VaultState {
  version: number;
  updatedAt: number;
  settingsUpdatedAt: number;
  isUneditedDefault: boolean;
  profile: TravelProfile;
  dialogues: DialogueTurn[];
  liveSubtitles: LiveSubtitleSegment[];
  menuSessions: MenuScanSession[];
  customPhrases: CustomPhraseCard[];
  shoppingItems: ShoppingCalcItem[];
  deletedIds: Record<string, number>;
}

export function createInitialVaultState(): VaultState {
  return {
    version: 1,
    updatedAt: 0,
    settingsUpdatedAt: 0,
    isUneditedDefault: true,
    profile: {
      nickname: 'Mona',
      activeLang: 'ja',
      preferredTone: 'polite',
      speechRate: 0.95,
      autoSpeakTranslation: true,
      faceToFaceFlipped: false,
      confirmTranscriptBeforeSend: false,
      customRatesToTwd: {},
      geminiApiKey: '',
      geminiModel: 'gemini-2.5-flash',
      hotelAddressCardZh: '司機先生您好，請載我到這間飯店，謝謝！',
      hotelAddressCardForeign: '運転手さん、このホテルまでお願いします。ありがとうございます！',
      dietaryAlertZh: '我不吃生食／不要加蔥與香菜，謝謝！',
      dietaryAlertForeign: '生もの・ネギ・パクチーは抜きでお願いします。ありがとうございます！',
    },
    dialogues: [],
    liveSubtitles: [],
    menuSessions: [],
    customPhrases: [],
    shoppingItems: [],
    deletedIds: {},
  };
}
