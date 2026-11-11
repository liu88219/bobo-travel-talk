import {
  LanguageCode,
  LanguageConfig,
  PhraseCategory,
  CustomPhraseCard,
  MenuScanSession,
} from '../types/travel';

export const LANGUAGES: Record<LanguageCode, LanguageConfig> = {
  ja: {
    code: 'ja',
    name: '日文',
    countryName: '日本',
    flag: '🇯🇵',
    bcp47: 'ja-JP',
    currencyCode: 'JPY',
    currencySymbol: '¥',
    currencyName: '日圓',
    defaultRateToTwd: 0.215,
    taxFreeThreshold: 5500,
    taxFreeRatePct: 10,
    taxFreeTip: '日本一般店鋪含稅滿 ¥5,500（未稅 ¥5,000）即可憑護照退 10% 消費稅！',
    orderGreeting: 'すみません、注文（ちゅうもん）をお願いします：',
    orderOutro: '以上です。よろしくお願いいたします！',
    sampleVoicePrompts: {
      zh: [
        '不好意思，請問這附近有推薦的拉麵店或洗手間嗎？',
        '請問有中文或英文菜單嗎？我們有兩位用餐。',
        '這個我要兩份，請幫我做成去冰、不要加蔥，謝謝！',
        '請問這樣總共多少錢？可以刷信用卡跟辦理退稅嗎？',
      ],
      foreign: [
        'いらっしゃいませ！何名様ですか？ご予約はありますか？',
        'お会計は5,800円になります。パスポートはお持ちですか？',
        'この電車は渋谷・新宿方面行きです。まもなく発車します。',
      ],
    },
  },
  ko: {
    code: 'ko',
    name: '韓文',
    countryName: '韓國',
    flag: '🇰🇷',
    bcp47: 'ko-KR',
    currencyCode: 'KRW',
    currencySymbol: '₩',
    currencyName: '韓元',
    defaultRateToTwd: 0.0235,
    taxFreeThreshold: 15000,
    taxFreeRatePct: 7,
    taxFreeTip: '韓國單筆消費滿 ₩15,000 即可辦理即時退稅（Immediate Tax Refund）或機場退稅！',
    orderGreeting: '저기요, 주문할게요 (不好意思，我要點餐)：',
    orderOutro: '이렇게 주세요. 감사합니다!',
    sampleVoicePrompts: {
      zh: [
        '不好意思，這個可以不要做太辣嗎？我們想要兩份。',
        '請問這個有新的庫存嗎？現場可以馬上退稅嗎？',
        '司機先生您好，請載我們到明洞飯店，謝謝！',
      ],
      foreign: [
        '어서 오세요! 몇 분이세요? 여기 앉으세요.',
        '총 삼만 오천 원입니다. 카드로 결제하시겠어요?',
      ],
    },
  },
  en: {
    code: 'en',
    name: '英文',
    countryName: '歐美／通用',
    flag: '🇺🇸',
    bcp47: 'en-US',
    currencyCode: 'USD',
    currencySymbol: '$',
    currencyName: '美金',
    defaultRateToTwd: 32.2,
    taxFreeThreshold: 100,
    taxFreeRatePct: 8,
    taxFreeTip: '歐美餐廳點餐可留意是否含服務費（Service Charge / Tip 15%~20%）。',
    orderGreeting: 'Excuse me, we would like to order these items:',
    orderOutro: 'That is all for now. Thank you very much!',
    sampleVoicePrompts: {
      zh: [
        '不好意思，我們沒有訂位，請問兩位現在有位子嗎？',
        '請問可以先幫我們寄放行李嗎？我們下午三點再回來辦理入住。',
        '請問這班列車會到市中心嗎？要在哪一月台搭乘？',
      ],
      foreign: [
        'Welcome! Would you like still or sparkling water for the table?',
        'Gate B14 has been changed to Gate C22. Boarding starts in 15 minutes.',
      ],
    },
  },
  th: {
    code: 'th',
    name: '泰文',
    countryName: '泰國',
    flag: '🇹🇭',
    bcp47: 'th-TH',
    currencyCode: 'THB',
    currencySymbol: '฿',
    currencyName: '泰銖',
    defaultRateToTwd: 0.95,
    taxFreeThreshold: 2000,
    taxFreeRatePct: 7,
    taxFreeTip: '泰國同一天同一商場滿 ฿2,000 可索取黃色 P.P.10 退稅單（7% VAT）！',
    orderGreeting: 'ขอโทษนะคะ ขอสั่งอาหารตามนี้ค่ะ (不好意思，請幫我點這些)：',
    orderOutro: 'ขอบคุณมากค่ะ (非常感謝)！',
    sampleVoicePrompts: {
      zh: [
        '這杯泰式奶茶請幫我做少糖、少冰，謝謝！',
        '這道菜請做小辣就好，不要加香菜。',
        '請問可以幫我開退稅單嗎？',
      ],
      foreign: [
        'สวัสดีค่ะ รับอะไรดีคะ เผ็ดน้อยไหมคะ?',
        'ทั้งหมดแปดร้อยห้าสิบบาทค่ะ สแกนหรือเงินสดคะ?',
      ],
    },
  },
  vi: {
    code: 'vi',
    name: '越南文',
    countryName: '越南',
    flag: '🇻🇳',
    bcp47: 'vi-VN',
    currencyCode: 'VND',
    currencySymbol: '₫',
    currencyName: '越南盾',
    defaultRateToTwd: 0.0013,
    taxFreeThreshold: 2000000,
    taxFreeRatePct: 8.5,
    taxFreeTip: '越南盾面額較大，看標價去後面 3 個 0 再乘以 1.3 大約就是台幣金額！',
    orderGreeting: 'Cho mình gọi những món này nhé:',
    orderOutro: 'Cảm ơn bạn nhiều nhé!',
    sampleVoicePrompts: {
      zh: [
        '這碗河粉請不要加香菜跟生豆芽，謝謝！',
        '請問這個多少錢？可以算便宜一點嗎？',
      ],
      foreign: ['Xin chào! Bạn muốn uống cà phê sữa đá không?'],
    },
  },
  fr: {
    code: 'fr',
    name: '法文',
    countryName: '法國',
    flag: '🇫🇷',
    bcp47: 'fr-FR',
    currencyCode: 'EUR',
    currencySymbol: '€',
    currencyName: '歐元',
    defaultRateToTwd: 34.8,
    taxFreeThreshold: 100.01,
    taxFreeRatePct: 12,
    taxFreeTip: '法國同一店鋪滿 €100.01 即可憑護照辦理 12% 信用卡或現金退稅（Détaxe）！',
    orderGreeting: 'Bonjour ! Nous voudrions commander ceci, s’il vous plaît :',
    orderOutro: 'C’est tout pour nous, merci beaucoup !',
    sampleVoicePrompts: {
      zh: [
        '日安！請問可以給我們一壺免費的飲用水（Carafe d’eau）跟英文菜單嗎？',
        '不好意思，我們想要結帳，並請幫我們辦理退稅單。',
      ],
      foreign: ['Bonjour ! Vous avez choisi ou vous voulez encore quelques minutes ?'],
    },
  },
  es: {
    code: 'es',
    name: '西班牙文',
    countryName: '西班牙',
    flag: '🇪🇸',
    bcp47: 'es-ES',
    currencyCode: 'EUR',
    currencySymbol: '€',
    currencyName: '歐元',
    defaultRateToTwd: 34.8,
    taxFreeThreshold: 1,
    taxFreeRatePct: 10,
    taxFreeTip: '西班牙已取消退稅最低消費門檻（DIVA 系統），任何金額皆可索取退稅單！',
    orderGreeting: '¡Hola! Nos gustaría pedir esto, por favor:',
    orderOutro: 'Eso es todo, ¡muchas gracias!',
    sampleVoicePrompts: {
      zh: ['您好！請給我們兩份海鮮燉飯跟帳單，謝謝！'],
      foreign: ['¡Hola! ¿Qué les gustaría tomar para empezar?'],
    },
  },
  de: {
    code: 'de',
    name: '德文',
    countryName: '德國',
    flag: '🇩🇪',
    bcp47: 'de-DE',
    currencyCode: 'EUR',
    currencySymbol: '€',
    currencyName: '歐元',
    defaultRateToTwd: 34.8,
    taxFreeThreshold: 50.01,
    taxFreeRatePct: 10,
    taxFreeTip: '德國單筆滿 €50.01 可索取 Global Blue / Planet 退稅單。',
    orderGreeting: 'Hallo! Wir möchten bitte Folgendes bestellen:',
    orderOutro: 'Das ist alles, vielen Dank!',
    sampleVoicePrompts: {
      zh: ['您好，請問這裡可以用信用卡付款嗎？我們想要結帳。'],
      foreign: ['Hallo! Möchten Sie zusammen oder getrennt zahlen?'],
    },
  },
};

export const LANGUAGE_LIST: LanguageConfig[] = Object.values(LANGUAGES);

export const PHRASE_CATEGORIES: Array<{
  id: PhraseCategory;
  label: string;
  emoji: string;
}> = [
  { id: 'custom', label: '我的專屬小卡＆收藏', emoji: '⭐' },
  { id: 'dining', label: '餐廳點餐＆忌口', emoji: '🍜' },
  { id: 'shopping', label: '購物退稅＆試穿', emoji: '🛍️' },
  { id: 'transport', label: '問路搭車＆交通', emoji: '🚕' },
  { id: 'hotel', label: '飯店入住＆行李', emoji: '🏨' },
  { id: 'pharmacy', label: '藥妝買藥＆症狀', emoji: '💊' },
  { id: 'social', label: '拍照＆禮貌社交', emoji: '📸' },
  { id: 'emergency', label: '緊急求助＆遺失', emoji: '🆘' },
];

export type MenuNoteGroup = 'remove' | 'taste' | 'service';

export interface DietaryOrderNoteItem {
  id: string;
  group: MenuNoteGroup;
  zh: string;
  translations: Record<LanguageCode, string>;
  phoneticHints?: Partial<Record<LanguageCode, string>>;
}

export const DIETARY_ORDER_NOTES: DietaryOrderNoteItem[] = [
  // 🚫 忌口＆去料 (remove)
  {
    id: 'no-green-onion',
    group: 'remove',
    zh: '🌿 不要蔥／不要香菜',
    translations: {
      ja: 'ネギ・パクチー抜きでお願いします',
      ko: '파하고 고수는 빼 주세요',
      en: 'No green onions or cilantro, please',
      th: 'ไม่ใส่ต้นหอมและผักชีค่ะ',
      vi: 'Không hành lá và không rau mùi nhé',
      fr: 'Sans oignons verts ni coriandre, s’il vous plaît',
      es: 'Sin cebolla verde ni cilantro, por favor',
      de: 'Ohne Frühlingszwiebeln und Koriander, bitte',
    },
    phoneticHints: {
      ja: '內gi・帕苦七 努ki 得 歐內嘎伊希媽斯',
      ko: '帕 哈勾 勾蘇 嫩 背 朱誰唷',
      th: '買塞 東紅 勒 帕七 卡',
    },
  },
  {
    id: 'no-wasabi',
    group: 'remove',
    zh: '🟢 不要芥末 (サビ抜き)',
    translations: {
      ja: 'わさび抜き（サビ抜き）でお願いします',
      ko: '와사비 빼 주세요',
      en: 'No wasabi, please',
      th: 'ไม่ใส่วาซาบิค่ะ',
      vi: 'Không bỏ mù tạt (wasabi) nhé',
      fr: 'Sans wasabi, s’il vous plaît',
      es: 'Sin wasabi, por favor',
      de: 'Ohne Wasabi, bitte',
    },
    phoneticHints: {
      ja: '撒比 努ki 得 歐內嘎伊希媽斯',
      ko: '哇撒比 背 朱誰唷',
    },
  },
  {
    id: 'no-garlic',
    group: 'remove',
    zh: '🧄 不要加蒜頭',
    translations: {
      ja: 'ニンニク抜きでお願いします',
      ko: '마늘 빼 주세요',
      en: 'No garlic, please',
      th: 'ไม่ใส่กระเทียมค่ะ',
      vi: 'Không bỏ tỏi nhé',
      fr: 'Sans ail, s’il vous plaît',
      es: 'Sin ajo, por favor',
      de: 'Ohne Knoblauch, bitte',
    },
    phoneticHints: {
      ja: '您尼苦 努ki 得 歐內嘎伊希媽斯',
      ko: '媽呢 背 朱誰唷',
    },
  },
  {
    id: 'no-beef',
    group: 'remove',
    zh: '🐄 不吃牛肉',
    translations: {
      ja: '牛肉（ぎゅうにく）は食べられません',
      ko: '소고기는 못 먹어요',
      en: 'I do not eat beef',
      th: 'ไม่ทานเนื้อวัวค่ะ',
      vi: 'Mình không ăn thịt bò',
      fr: 'Je ne mange pas de bœuf',
      es: 'No como carne de res',
      de: 'Ich esse kein Rindfleisch',
    },
    phoneticHints: {
      ja: '牛尼苦 哇 塔杯拉勒媽線',
      ko: '搜勾gi 嫩 某 某勾唷',
    },
  },
  {
    id: 'no-pork',
    group: 'remove',
    zh: '🐷 不吃豬肉',
    translations: {
      ja: '豚肉（ぶたにく）は食べられません',
      ko: '돼지고기는 못 먹어요',
      en: 'I do not eat pork',
      th: 'ไม่ทานเนื้อหมูค่ะ',
      vi: 'Mình không ăn thịt heo',
      fr: 'Je ne mange pas de porc',
      es: 'No como carne de cerdo',
      de: 'Ich esse kein Schweinefleisch',
    },
    phoneticHints: {
      ja: '布塔尼苦 哇 塔杯拉勒媽線',
      ko: '堆吉勾gi 嫩 某 某勾唷',
    },
  },

  // 🍜 口味＆飲品調整 (taste)
  {
    id: 'no-ice',
    group: 'taste',
    zh: '🧊 飲料去冰／少冰',
    translations: {
      ja: '氷なし（または氷少なめ）でお願いします',
      ko: '얼음 빼고(조금만) 주세요',
      en: 'No ice (or less ice), please',
      th: 'ไม่ใส่น้ำแข็ง (หรือน้ำแข็งน้อย) ค่ะ',
      vi: 'Cho mình ít đá hoặc không đá nhé',
      fr: 'Sans glaçons, s’il vous plaît',
      es: 'Sin hielo, por favor',
      de: 'Ohne Eis, bitte',
    },
    phoneticHints: {
      ja: '口哩 那希（口哩 斯苦那妹）得 歐內嘎伊希媽斯',
      ko: '歐冷 背勾 朱誰唷',
      th: '買塞 楠肯 卡',
    },
  },
  {
    id: 'less-spicy',
    group: 'taste',
    zh: '🌶️ 請做小辣／不辣',
    translations: {
      ja: '辛さ控えめ（または辛くないよう）でお願いします',
      ko: '안 맵게(조금만 맵게) 해 주세요',
      en: 'Mild or non-spicy, please',
      th: 'เผ็ดน้อยมากๆ (หรือไม่เผ็ด) ค่ะ',
      vi: 'Làm ít cay hoặc không cay giúp mình nhé',
      fr: 'Pas épicé, s’il vous plaît',
      es: 'Sin picante, por favor',
      de: 'Bitte nicht scharf',
    },
    phoneticHints: {
      ja: '卡拉撒 喜卡欸妹 得 歐內嘎伊希媽斯',
      ko: '安 妹給 嘿 朱誰唷',
      th: '佩餒 罵罵（買佩）卡',
    },
  },
  {
    id: 'no-sugar',
    group: 'taste',
    zh: '🍬 飲料無糖／微糖',
    translations: {
      ja: '無糖（甘み抜き・シロップなし）でお願いします',
      ko: '시럽 빼고(덜 달게) 해 주세요',
      en: 'Unsweetened / less sugar, please',
      th: 'หวานน้อยมากๆ (หรือไม่ใส่น้ำตาล) ค่ะ',
      vi: 'Ít đường hoặc không đường nhé',
      fr: 'Sans sucre, s’il vous plaît',
      es: 'Sin azúcar, por favor',
      de: 'Ohne Zucker, bitte',
    },
    phoneticHints: {
      ja: '阿媽咪 努ki（希漏普 那希）得 歐內嘎伊希媽斯',
      ko: '偷 達給 嘿 朱誰唷',
      th: '丸餒 罵罵 卡',
    },
  },
  {
    id: 'light-soup',
    group: 'taste',
    zh: '🧂 湯頭／口味清淡一點',
    translations: {
      ja: '味は薄め（あっさり）でお願いします',
      ko: '싱겁게(덜 짜게) 해 주세요',
      en: 'Less salty / lighter flavor, please',
      th: 'ขอรสไม่จัด (เค็มน้อย) ค่ะ',
      vi: 'Làm nhạt hơn một chút giúp mình nhé',
      fr: 'Moins salé, s’il vous plaît',
      es: 'Con poca sal, por favor',
      de: 'Weniger salzig, bitte',
    },
    phoneticHints: {
      ja: '阿吉 哇 烏斯妹 得 歐內嘎伊希媽斯',
      ko: '偷 扎給 嘿 朱誰唷',
    },
  },
  {
    id: 'less-rice',
    group: 'taste',
    zh: '🍚 飯量少一點 (少なめ)',
    translations: {
      ja: 'ご飯は少なめでお願いします',
      ko: '밥은 조금만 주세요',
      en: 'Less rice, please',
      th: 'ขอข้าวน้อยค่ะ',
      vi: 'Cho mình ít cơm thôi nhé',
      fr: 'Un peu moins de riz, s’il vous plaît',
      es: 'Con poco arroz, por favor',
      de: 'Wenig Reis, bitte',
    },
    phoneticHints: {
      ja: '勾航 哇 斯苦那妹 得 歐內嘎伊希媽斯',
      ko: '帕奔 揪跟慢 朱誰唷',
    },
  },
  {
    id: 'well-done-egg',
    group: 'taste',
    zh: '🥚 蛋／肉要全熟',
    translations: {
      ja: '卵（お肉）はよく焼き（しっかり加熱）でお願いします',
      ko: '계란(고기)은 완전히 익혀 주세요',
      en: 'Egg / meat well-done (fully cooked), please',
      th: 'ขอไข่สุกๆ (เนื้อสุกๆ) ค่ะ',
      vi: 'Làm trứng chín kỹ (thịt chín kỹ) giúp mình nhé',
      fr: 'Bien cuit, s’il vous plaît',
      es: 'Bien cocido, por favor',
      de: 'Gut durchgebraten, bitte',
    },
    phoneticHints: {
      ja: '塔媽勾 哇 唷苦雅ki 得 歐內嘎伊希媽斯',
      ko: '丸炯喜 伊ㄎ優 朱誰唷',
    },
  },

  // 🙋 桌邊服務＆外帶結帳 (service)
  {
    id: 'ask-water',
    group: 'service',
    zh: '💧 請給我冰水／飲用水',
    translations: {
      ja: 'すみません、お水（おひや）をください',
      ko: '저기요, 물 좀 주세요',
      en: 'Could we have some tap water, please?',
      th: 'ขอน้ำเปล่าด้วยค่ะ',
      vi: 'Cho mình xin nước lọc nhé',
      fr: 'Une carafe d’eau, s’il vous plaît',
      es: 'Un vaso de agua, por favor',
      de: 'Ein Glas Leitungswasser, bitte',
    },
    phoneticHints: {
      ja: '斯咪媽線，歐咪茲 歐 苦達賽',
      ko: '揪gi唷，木 炯 朱誰唷',
      fr: '暈 卡拉夫 兜 希夫普蕾',
    },
  },
  {
    id: 'small-plates',
    group: 'service',
    zh: '🥣 請給我分食小碗／小盤子',
    translations: {
      ja: '取り皿（とりざら）とスプーンをください',
      ko: '앞접시랑 수저 좀 주세요',
      en: 'Could we have small sharing plates, please?',
      th: 'ขอจานแบ่งและช้อนด้วยค่ะ',
      vi: 'Cho mình xin chén nhỏ để chia đồ ăn nhé',
      fr: 'Pourriez-vous nous apporter de petites assiettes ?',
      es: '¿Nos trae platos pequeños para compartir, por favor?',
      de: 'Könnten wir bitte kleine Teller zum Teilen haben?',
    },
    phoneticHints: {
      ja: '偷哩扎拉 歐 苦達賽',
      ko: '阿揪希 郎 蘇揪 炯 朱誰唷',
    },
  },
  {
    id: 'takeout-order',
    group: 'service',
    zh: '🥡 我要外帶／打包 (持ち帰り)',
    translations: {
      ja: '持ち帰り（テイクアウト）でお願いします',
      ko: '포장해 주세요 (가지고 갈게요)',
      en: 'To go / takeaway, please',
      th: 'สั่งกลับบ้านค่ะ (ใส่กล่อง)',
      vi: 'Cho mìnhแพ็ค mang về nhé',
      fr: 'À emporter, s’il vous plaît',
      es: 'Para llevar, por favor',
      de: 'Zum Mitnehmen, bitte',
    },
    phoneticHints: {
      ja: '某七卡欸哩（Take-out）得 歐內嘎伊希媽斯',
      ko: '坡江 嘿 朱誰唷',
    },
  },
  {
    id: 'tax-free',
    group: 'service',
    zh: '🧾 請幫我結帳／免稅',
    translations: {
      ja: 'お会計（または免税手続き）をお願いします',
      ko: '계산(택스 리펀드) 해 주세요',
      en: 'Could we have the bill (or Tax-Free form), please?',
      th: 'เช็คบิล (ขอใบกำกับภาษี VAT Refund) ด้วยค่ะ',
      vi: 'Tính tiền giúp mình nhé',
      fr: 'L’addition (et la détaxe), s’il vous plaît',
      es: 'La cuenta, por favor',
      de: 'Die Rechnung, bitte',
    },
    phoneticHints: {
      ja: '歐開K 歐 歐內嘎伊希媽斯',
      ko: '給三 嘿 朱誰唷',
    },
  },
];

export interface BuiltinPhraseItem {
  id: string;
  category: Exclude<PhraseCategory, 'custom'>;
  zhText: string;
  note?: string;
  translations: Record<
    LanguageCode,
    {
      text: string;
      romanization: string;
      phoneticHint: string;
    }
  >;
}

export const BUILTIN_SURVIVAL_PHRASES: BuiltinPhraseItem[] = [
  // 🍜 餐廳點餐＆忌口
  {
    id: 'din-table-for-two',
    category: 'dining',
    zhText: '不好意思，我們有兩位，請問現在有位子嗎？',
    note: '進餐廳第一句必備',
    translations: {
      ja: {
        text: 'すみません、2人ですが、席は空いていますか？',
        romanization: 'Sumimasen, futari desu ga, seki wa aite imasu ka?',
        phoneticHint: '斯咪媽線，胡塔哩 得斯嘎，誰ki 哇 阿伊貼 伊媽斯卡？',
      },
      ko: {
        text: '저기요, 두 명인데 지금 자리 있나요?',
        romanization: 'Jeogiyo, du myeong-inde jigeum jari innayo?',
        phoneticHint: '揪gi唷，嘟 謬音爹 吉跟 洽哩 伊那唷？',
      },
      en: {
        text: 'Excuse me, table for two, please. Do you have any seats available?',
        romanization: 'Table for two, please.',
        phoneticHint: '伊克思Q斯咪，貼波 否 兔 普利斯',
      },
      th: {
        text: 'ขอโทษนะคะ มา 2 คนค่ะ มีโต๊ะว่างไหมคะ?',
        romanization: 'Khor thot na kha, ma song khon kha, mi to wang mai kha?',
        phoneticHint: '口偷娜卡，媽 聳 空卡，咪 兜 汪 買卡？',
      },
      vi: {
        text: 'Xin lỗi, cho mình bàn 2 người nhé, còn chỗ không ạ?',
        romanization: 'Xin loi, cho minh ban 2 nguoi nhe',
        phoneticHint: '新樓伊，揪 明 板 嗨 阮 捏',
      },
      fr: {
        text: 'Bonjour, une table pour deux personnes, s’il vous plaît.',
        romanization: 'Bonjour, une table pour deux personnes',
        phoneticHint: '崩啾，暈 塔布 普 德 佩頌',
      },
      es: {
        text: 'Hola, una mesa para dos personas, por favor.',
        romanization: 'Una mesa para dos personas, por favor',
        phoneticHint: '歐拉，烏那 梅薩 帕拉 兜斯 佩索那斯',
      },
      de: {
        text: 'Hallo, einen Tisch für zwei Personen, bitte.',
        romanization: 'Einen Tisch für zwei Personen, bitte',
        phoneticHint: '哈囉，愛嫩 替許 夫爾 茲歪 佩奏嫩 筆特',
      },
    },
  },
  {
    id: 'din-recommend-menu',
    category: 'dining',
    zhText: '請問有中文或英文菜單嗎？最推薦的招牌菜是什麼？',
    note: '看不懂菜單時救星',
    translations: {
      ja: {
        text: '英語か中国語のメニューはありますか？一番のおすすめは何ですか？',
        romanization: 'Eigo ka chuugokugo no menyuu wa arimasu ka? Ichiban no osusume wa nan desu ka?',
        phoneticHint: '欸狗 卡 丘勾苦狗 弄 美牛 哇 阿哩媽斯卡？伊七棒 弄 歐斯斯妹 哇 楠得斯卡？',
      },
      ko: {
        text: '중국어나 영어 메뉴판 있나요? 제일 인기 있는 메뉴가 뭐예요?',
        romanization: 'Junggug-eona yeong-eo menyupan innayo? Jeil in-gi inneun menyuga mwoyeyo?',
        phoneticHint: '中估勾那 庸歐 美牛潘 伊那唷？切依 音gi 伊嫩 美牛嘎 摸耶唷？',
      },
      en: {
        text: 'Do you have an English menu? What is your most popular signature dish?',
        romanization: 'What is your most popular signature dish?',
        phoneticHint: '哇特 伊斯 優 某斯特 帕ピュー樂 迪許？',
      },
      th: {
        text: 'มีเมนูภาษาอังกฤษไหมคะ? เมนูแนะนำคืออะไรคะ?',
        romanization: 'Mi menu phasa angkrit mai kha? Menu naenam khue arai kha?',
        phoneticHint: '咪 美牛 帕薩 昂給 買卡？美牛 內楠 可 阿來卡？',
      },
      vi: {
        text: 'Có thực đơn tiếng Anh không ạ? Món đặc trưng nhất là gì?',
        romanization: 'Co thuc don tieng Anh khong a?',
        phoneticHint: '勾 特燈 點安 空阿？',
      },
      fr: {
        text: 'Avez-vous un menu en anglais ? Quel est votre plat signature ?',
        romanization: 'Avez-vous un menu en anglais ?',
        phoneticHint: '阿飛夫 昂 美牛 昂 昂葛蕾？',
      },
      es: {
        text: '¿Tiene menú en inglés? ¿Cuál es el plato más recomendado?',
        romanization: '¿Cuál es el plato más recomendado?',
        phoneticHint: '誇 欸斯 欸 普拉頭 媽斯 瑞口曼達兜？',
      },
      de: {
        text: 'Haben Sie eine englische Speisekarte? Was können Sie empfehlen?',
        romanization: 'Haben Sie eine englische Speisekarte?',
        phoneticHint: '哈本 茲 愛呢 應里許 史派澤卡特？',
      },
    },
  },
  {
    id: 'din-no-coriander-onion',
    category: 'dining',
    zhText: '這個請給我一份，請不要加蔥、不要香菜，飲料去冰！',
    note: '點餐客製化金句',
    translations: {
      ja: {
        text: 'これを1つください。ネギとパクチーは抜きで、飲み物は氷なしでお願いします。',
        romanization: 'Kore o hitotsu kudasai. Negi to pakuchii wa nuki de, koori nashi de onegaishimasu.',
        phoneticHint: '口勒 歐 喜偷茲 苦達賽。內gi 偷 帕苦七 哇 努ki 得，口哩 那希 得 歐內嘎伊希媽斯',
      },
      ko: {
        text: '이거 하나 주세요. 파랑 고수는 빼 주시고, 음료는 얼음 빼 주세요.',
        romanization: 'Igeo hana juseyo. Parang gosuneun ppae jusigo, eol-eum ppae juseyo.',
        phoneticHint: '伊勾 哈那 朱誰唷。帕郎 勾蘇嫩 背 朱希勾，歐冷 背 朱誰唷',
      },
      en: {
        text: 'One of this, please—no green onions or cilantro, and no ice for the drink.',
        romanization: 'No green onions or cilantro, and no ice, please.',
        phoneticHint: '弄 葛林 昂尼恩 歐 希蘭戳，安 弄 愛斯 普利斯',
      },
      th: {
        text: 'เอาอันนี้ 1 ที่ค่ะ ไม่ใส่ต้นหอมและผักชี และเครื่องดื่มไม่ใส่น้ำแข็งค่ะ',
        romanization: 'Ao an ni nueng thi kha. Mai sai ton-hom lae phak-chi, mai sai nam-khaeng kha.',
        phoneticHint: '熬 安尼 能 替卡。買塞 動紅 雷 帕七，買塞 楠肯卡',
      },
      vi: {
        text: 'Cho mình 1 phần này, không hành lá, không rau mùi và đồ uống không đá nhé.',
        romanization: 'Khong hanh la, khong rau mui va khong da nhe.',
        phoneticHint: '空 含拉，空 繞母伊 乏 空打 捏',
      },
      fr: {
        text: 'Je prends ceci, sans oignons verts ni coriandre, et la boisson sans glaçons, s’il vous plaît.',
        romanization: 'Sans oignons verts ni coriandre, sans glaçons',
        phoneticHint: '桑 宗勇 飛 尼 口哩昂德，桑 葛拉松',
      },
      es: {
        text: 'Quiero uno de esto, sin cebolla verde ni cilantro, y la bebida sin hielo, por favor.',
        romanization: 'Sin cebolla verde ni cilantro, y sin hielo',
        phoneticHint: '新 誰波呀 飛得 尼 希蘭戳，伊 新 耶樓',
      },
      de: {
        text: 'Einmal das hier bitte, ohne Frühlingszwiebeln, ohne Koriander und das Getränk ohne Eis.',
        romanization: 'Ohne Frühlingszwiebeln, ohne Koriander, ohne Eis',
        phoneticHint: '歐呢 夫林茲威本，歐呢 口哩安德，歐呢 愛斯',
      },
    },
  },
  {
    id: 'din-check-bill-card',
    category: 'dining',
    zhText: '不好意思，我們要結帳，請問可以刷信用卡或 Apple Pay 嗎？',
    note: '結帳必問',
    translations: {
      ja: {
        text: 'すみません、お会計をお願いします。クレジットカードやタッチ決済は使えますか？',
        romanization: 'Sumimasen, okaikei o onegaishimasu. Kurejitto kaado wa tsukaemasu ka?',
        phoneticHint: '斯咪媽線，歐開K 歐 歐內嘎伊希媽斯。苦勒吉偷 卡兜 哇 茲卡欸媽斯卡？',
      },
      ko: {
        text: '저기요, 계산해 주세요. 신용카드 결제 되나요?',
        romanization: 'Jeogiyo, gyesanhae juseyo. Sinyongkadeu gyeolje doenayo?',
        phoneticHint: '揪gi唷，給三黑 朱誰唷。新庸卡德 給姐 堆那唷？',
      },
      en: {
        text: 'Excuse me, could we have the bill, please? Do you accept credit cards or Apple Pay?',
        romanization: 'Could we have the bill, please? Do you accept credit cards?',
        phoneticHint: '苦德 威 黑夫 了 必歐 普利斯？肚 優 額誰普特 苦勒迪 卡茲？',
      },
      th: {
        text: 'เช็คบิลด้วยค่ะ รับบัตรเครดิตไหมคะ?',
        romanization: 'Chek bin duai kha. Rap bat khredit mai kha?',
        phoneticHint: 'Check 賓 堆卡。拉 巴 苦勒迪 買卡？',
      },
      vi: {
        text: 'Cho mình tính tiền nhé. Ở đây có nhận thẻ tín dụng không ạ?',
        romanization: 'Cho minh tinh tien nhe. Co nhan the tin dung khong a?',
        phoneticHint: '揪 明 頂點 捏。勾 娘 鐵 頂用 空阿？',
      },
      fr: {
        text: 'L’addition, s’il vous plaît. Acceptez-vous la carte bancaire ?',
        romanization: 'L’addition, s’il vous plaît. Acceptez-vous la carte ?',
        phoneticHint: '拉迪兄 希夫普蕾。阿誰普貼夫 拉 卡特？',
      },
      es: {
        text: 'La cuenta, por favor. ¿Aceptan tarjeta de crédito?',
        romanization: 'La cuenta, por favor. ¿Aceptan tarjeta?',
        phoneticHint: '拉 困塔 破法否。阿誰普坦 塔黑塔？',
      },
      de: {
        text: 'Die Rechnung, bitte. Kann ich mit Kreditkarte bezahlen?',
        romanization: 'Die Rechnung, bitte. Mit Kreditkarte bezahlen?',
        phoneticHint: '迪 瑞許農 筆特。密特 苦勒迪卡特 被擦冷？',
      },
    },
  },

  // 🛍️ 購物退稅＆試穿
  {
    id: 'shop-new-stock-try',
    category: 'shopping',
    zhText: '請問這件可以試穿嗎？有沒有全新的庫存或小一號的尺寸？',
    note: '買衣服／球鞋必用',
    translations: {
      ja: {
        text: 'これ、試着（しちゃく）してもいいですか？新しい在庫か、もう一つ小さいサイズはありますか？',
        romanization: 'Kore, shichaku shitemo ii desu ka? Atarashii zaiko wa arimasu ka?',
        phoneticHint: '口勒，希洽苦 希貼某 伊得斯卡？阿塔拉希 災口 哇 阿哩媽斯卡？',
      },
      ko: {
        text: '이거 입어 봐도 되나요? 새 상품이나 한 사이즈 작은 거 있나요?',
        romanization: 'Igeo ibeo bwado doenayo? Sae sangpum-ina han saijeu jageun geo innayo?',
        phoneticHint: '伊勾 伊波 巴兜 堆那唷？誰 桑普米那 含 賽伊茲 洽跟 勾 伊那唷？',
      },
      en: {
        text: 'May I try this on? Do you have a brand-new piece in stock or one size smaller?',
        romanization: 'May I try this on? Do you have a brand-new one in stock?',
        phoneticHint: '梅 愛 踹 李斯 昂？肚 優 黑夫 額 ニュ 汪 音 史塔克？',
      },
      th: {
        text: 'ขอลองใส่ได้ไหมคะ? มีของใหม่ในสต็อกหรือไซส์เล็กกว่านี้ไหมคะ?',
        romanization: 'Khor long sai dai mai kha? Mi khong mai nai satok mai kha?',
        phoneticHint: '口 龍塞 戴買卡？咪 空買 奈 史塔克 買卡？',
      },
      vi: {
        text: 'Mình mặc thử cái này được không? Có hàng mới trong kho hoặc size nhỏ hơn không?',
        romanization: 'Minh mac thu cai nay duoc khong?',
        phoneticHint: '明 媽特 改奶 得空？',
      },
      fr: {
        text: 'Puis-je essayer ceci ? Avez-vous une pièce neuve en stock ou une taille en dessous ?',
        romanization: 'Puis-je essayer ceci ?',
        phoneticHint: '普伊九 欸誰耶 瑟希？',
      },
      es: {
        text: '¿Puedo probarme esto? ¿Tiene uno nuevo en almacén o una talla más pequeña?',
        romanization: '¿Puedo probarme esto?',
        phoneticHint: '普威兜 普羅巴妹 欸斯頭？',
      },
      de: {
        text: 'Kann ich das anprobieren? Haben Sie ein neues Stück auf Lager oder eine Nummer kleiner?',
        romanization: 'Kann ich das anprobieren?',
        phoneticHint: '看 伊許 達斯 安普羅逼冷？',
      },
    },
  },
  {
    id: 'shop-tax-free',
    category: 'shopping',
    zhText: '請問這裡可以辦理退稅（Tax-Free）嗎？我有帶護照！',
    note: '百貨／藥妝結帳必問',
    translations: {
      ja: {
        text: 'ここで免税（Tax-Free）はできますか？パスポートを持っています！',
        romanization: 'Koko de menzei (Tax-Free) wa dekimasu ka? Pasupooto o motte imasu!',
        phoneticHint: '口口 得 麵Z 哇 得ki媽斯卡？帕斯破頭 歐 某貼 伊媽斯！',
      },
      ko: {
        text: '여기서 바로 택스 리펀드(면세) 되나요? 여권 가지고 있어요!',
        romanization: 'Yeogiseo baro taekseu ripeondeu doenayo? Yeogwon gajigo isseoyo!',
        phoneticHint: '唷gi搜 巴樓 Tax Refund 堆那唷？唷光 卡吉勾 伊搜唷！',
      },
      en: {
        text: 'Can I get a Tax-Free refund here? I have my passport with me!',
        romanization: 'Can I get a Tax-Free refund here?',
        phoneticHint: '看 愛 給特 額 Tax-Free 瑞方 希爾？',
      },
      th: {
        text: 'ที่นี่ทำ VAT Refund ได้ไหมคะ? มีพาสปอร์ตมาด้วยค่ะ',
        romanization: 'Thi ni tham VAT Refund dai mai kha? Mi passport ma duai kha.',
        phoneticHint: '替尼 貪 VAT Refund 戴買卡？咪 Passport 媽堆卡',
      },
      vi: {
        text: 'Ở đây có hoàn thuế (Tax-Free) không ạ? Mình có mang hộ chiếu!',
        romanization: 'O day co hoan thue Tax-Free khong a?',
        phoneticHint: '歐得 勾 環腿 Tax-Free 空阿？',
      },
      fr: {
        text: 'Faites-vous la détaxe (Tax-Free) ici ? J’ai mon passeport avec moi !',
        romanization: 'Faites-vous la détaxe ici ?',
        phoneticHint: '費特夫 拉 得塔克斯 伊希？',
      },
      es: {
        text: '¿Hacen Tax-Free aquí? ¡Tengo mi pasaporte conmigo!',
        romanization: '¿Hacen Tax-Free aquí?',
        phoneticHint: '阿森 Tax-Free 阿ki？',
      },
      de: {
        text: 'Machen Sie hier Tax-Free? Ich habe meinen Reisepass dabei!',
        romanization: 'Machen Sie hier Tax-Free?',
        phoneticHint: '媽狠 茲 希爾 Tax-Free？',
      },
    },
  },

  // 🚕 問路搭車＆交通
  {
    id: 'trans-take-me-address',
    category: 'transport',
    zhText: '司機先生／小姐您好，請載我到地圖上的這個地址，謝謝！',
    note: '搭計程車／Uber 給司機看',
    translations: {
      ja: {
        text: '運転手さん、こんにちは。この地図の住所までお願いします。ありがとうございます！',
        romanization: 'Untenshu-san, kono chizu no juusho made onegaishimasu.',
        phoneticHint: '溫天修桑，口弄 七茲 弄 啾修 媽得 歐內嘎伊希媽斯',
      },
      ko: {
        text: '기사님 안녕하세요! 이 지도 주소로 가 주세요. 감사합니다!',
        romanization: 'Gisanim, i jido jusoro ga juseyo. Gamsahamnida!',
        phoneticHint: 'gi薩您，伊 吉兜 朱搜樓 卡 朱誰唷。康撒哈咪達！',
      },
      en: {
        text: 'Hello! Could you please take me to this address on the map? Thank you!',
        romanization: 'Could you please take me to this address?',
        phoneticHint: '苦德 優 普利斯 貼克 咪 兔 李斯 額追斯？',
      },
      th: {
        text: 'สวัสดีค่ะ ช่วยไปส่งตามที่อยู่ในแผนที่นี้หน่อยนะคะ ขอบคุณค่ะ',
        romanization: 'Chuai pai song tam thi-yu nai phaen-thi ni noi na kha.',
        phoneticHint: '吹 掰送 單 替優 奈 偏替尼 餒娜卡',
      },
      vi: {
        text: 'Chào bác tài, cho mình đến địa chỉ này trên bản đồ nhé. Cảm ơn nhiều!',
        romanization: 'Cho minh den dia chi nay tren ban do nhe.',
        phoneticHint: '揪 明 點 底阿幾 奶 真 板兜 捏',
      },
      fr: {
        text: 'Bonjour, pourriez-vous m’emmener à cette adresse sur la carte, s’il vous plaît ?',
        romanization: 'Pourriez-vous m’emmener à cette adresse ?',
        phoneticHint: '普哩耶夫 芒麼內 阿 誰特 阿德瑞斯？',
      },
      es: {
        text: 'Hola, ¿me puede llevar a esta dirección en el mapa, por favor?',
        romanization: '¿Me puede llevar a esta dirección?',
        phoneticHint: '梅 普威得 耶法 阿 欸斯塔 迪瑞克兄？',
      },
      de: {
        text: 'Hallo, könnten Sie mich bitte zu dieser Adresse auf der Karte fahren?',
        romanization: 'Könnten Sie mich bitte zu dieser Adresse fahren?',
        phoneticHint: '肯騰 茲 密許 筆特 促 迪澤 阿德瑞瑟 法冷？',
      },
    },
  },
  {
    id: 'trans-train-station',
    category: 'transport',
    zhText: '不好意思，請問這班車有到這個站嗎？應該在哪個月台搭車？',
    note: '日本地鐵／歐洲火車問路',
    translations: {
      ja: {
        text: 'すみません、この電車はこの駅に行きますか？何番ホームに乗ればいいですか？',
        romanization: 'Sumimasen, kono densha wa kono eki ni ikimasu ka? Nanban hoomu desu ka?',
        phoneticHint: '斯咪媽線，口弄 點洽 哇 口弄 欸ki 尼 伊ki媽斯卡？楠棒 Home 得斯卡？',
      },
      ko: {
        text: '저기요, 이 열차가 이 역으로 가나요? 몇 번 승강장에서 타야 하나요?',
        romanization: 'I yeolchaga i yeog-euro ganayo? Myeot beon seung-gangjang-eseo taya hanayo?',
        phoneticHint: '伊 唷洽嘎 伊 唷格樓 卡那唷？謬 崩 升剛江欸搜 塔呀 哈那唷？',
      },
      en: {
        text: 'Excuse me, does this train go to this station? Which platform should I take?',
        romanization: 'Does this train go to this station? Which platform?',
        phoneticHint: '達斯 李斯 吹恩 夠 兔 李斯 史貼選？威曲 普蕾特鳳？',
      },
      th: {
        text: 'ขอโทษนะคะ รถไฟขบวนนี้ไปสถานีนี้ไหมคะ? ต้องขึ้นชานชาลาไหนคะ?',
        romanization: 'Rot-fai khabuan ni pai sathani ni mai kha?',
        phoneticHint: '樓ไฟ 卡วน尼 掰 薩塔尼 尼 買卡？',
      },
      vi: {
        text: 'Xin lỗi, chuyến tàu/xe này có đi đến trạm này không ạ?',
        romanization: 'Chuyen xe nay co di den tram nay khong a?',
        phoneticHint: '圈 誰奶 勾 迪 點 站奶 空阿？',
      },
      fr: {
        text: 'Excusez-moi, ce train va-t-il à cette gare ? C’est sur quel quai ?',
        romanization: 'Ce train va-t-il à cette gare ? Quel quai ?',
        phoneticHint: '瑟 趟 法替 阿 誰特 嘎？K 給？',
      },
      es: {
        text: 'Disculpe, ¿este tren va a esta estación? ¿En qué andén debo subir?',
        romanization: '¿Este tren va a esta estación?',
        phoneticHint: '欸斯貼 吹恩 法 阿 欸斯塔 欸斯塔兄？',
      },
      de: {
        text: 'Entschuldigung, fährt dieser Zug zu diesem Bahnhof? Welches Gleis ist das?',
        romanization: 'Fährt dieser Zug zu diesem Bahnhof? Welches Gleis?',
        phoneticHint: '費爾特 迪澤 促克 促 迪怎 班後夫？飛許斯 葛來斯？',
      },
    },
  },

  // 🏨 飯店入住＆行李
  {
    id: 'hotel-luggage-store',
    category: 'hotel',
    zhText: '您好，我要辦理入住（Check-in）！若還沒到時間，請問可以先寄放行李嗎？',
    note: '抵達飯店第一件事',
    translations: {
      ja: {
        text: 'こんにちは、チェックインをお願いします。もしまだ早ければ、先に荷物を預かっていただけますか？',
        romanization: 'Chekku-in o onegaishimasu. Saki ni nimotsu o azukatte itadakemasu ka?',
        phoneticHint: 'Check-in 歐 歐內嘎伊希媽斯。撒ki 尼 尼某茲 歐 阿茲卡貼 伊塔達K媽斯卡？',
      },
      ko: {
        text: '안녕하세요, 체크인 부탁드립니다. 혹시 시간 전이면 짐을 먼저 맡길 수 있을까요?',
        romanization: 'Chekeu-in butakdeurimnida. Jim-eul meonjeo matgil su isseulkkayo?',
        phoneticHint: 'Check-in 不塔德林尼達。吉悶 某揪 媽gi 蘇 伊斯嘎唷？',
      },
      en: {
        text: 'Hello, I would like to check in. If it is too early, could we leave our luggage here first?',
        romanization: 'Could we leave our luggage here first?',
        phoneticHint: '苦德 威 利夫 奧爾 拉gi舉 希爾 佛斯特？',
      },
      th: {
        text: 'สวัสดีค่ะ มาเช็คอินค่ะ ถ้ายังไม่ถึงเวลา ขอฝากกระเป๋าไว้ก่อนได้ไหมคะ?',
        romanization: 'Ma check-in kha. Khor fak krapao wai kon dai mai kha?',
        phoneticHint: '媽 Check-in 卡。口 法 嘎包 歪 拱 戴買卡？',
      },
      vi: {
        text: 'Xin chào, mình muốn nhận phòng. Mình có thể gửi hành lý ở đây trước được không?',
        romanization: 'Minh co the gui hanh ly o day truoc duoc khong?',
        phoneticHint: '明 勾 鐵 鬼 含哩 歐得 桌 得空？',
      },
      fr: {
        text: 'Bonjour, je voudrais faire le check-in. Puis-je déposer mes bagages en consigne d’abord ?',
        romanization: 'Puis-je déposer mes bagages d’abord ?',
        phoneticHint: '普伊九 得破Z 妹 巴嘎舉 達波？',
      },
      es: {
        text: 'Hola, quisiera hacer el check-in. ¿Podemos guardar el equipaje aquí primero?',
        romanization: '¿Podemos guardar el equipaje aquí primero?',
        phoneticHint: '破得某斯 瓜達 欸 欸ki帕黑 阿ki？',
      },
      de: {
        text: 'Hallo, ich möchte einchecken. Können wir unser Gepäck zuerst hier abstellen?',
        romanization: 'Können wir unser Gepäck zuerst hier abstellen?',
        phoneticHint: '肯嫩 威爾 溫澤 給佩克 促欸斯特 希爾 阿普史貼冷？',
      },
    },
  },

  // 💊 藥妝買藥＆症狀
  {
    id: 'pharm-stomach-cold',
    category: 'pharmacy',
    zhText: '不好意思，我有一點頭痛／腸胃不舒服，請問有推薦不會想睡覺的常備藥嗎？',
    note: '藥妝店詢問藥師',
    translations: {
      ja: {
        text: 'すみません、頭痛（または胃腸の不調）があるのですが、眠くならないおすすめの薬はありますか？',
        romanization: 'Zutsuu / ichou no fuchou ga aru no desu ga, nemukunaranai kusuri wa arimasu ka?',
        phoneticHint: '茲茲／伊丘 弄 胡丘 嘎 阿魯弄得斯嘎，內母苦那拉奈 苦斯哩 哇 阿哩媽斯卡？',
      },
      ko: {
        text: '저기요, 두통(소화불량)이 있는데 졸리지 않는 추천 약이 있나요?',
        romanization: 'Dutong(sohwabullyang)-i inneunde jolliji anneun yak innayo?',
        phoneticHint: '嘟痛（搜花不良）伊 伊嫩爹，揪哩吉 安嫩 呀 伊那唷？',
      },
      en: {
        text: 'Excuse me, I have a headache / upset stomach. Do you recommend any non-drowsy medicine?',
        romanization: 'Do you recommend any non-drowsy medicine?',
        phoneticHint: '肚 優 瑞口曼 欸尼 囊抓西 梅迪森？',
      },
      th: {
        text: 'ขอโทษนะคะ ปวดหัว/ปวดท้องค่ะ มียาแนะนำที่ไม่ทำให้ง่วงไหมคะ?',
        romanization: 'Puat hua / puat thong kha. Mi ya naenam thi mai tham hai nguang mai kha?',
        phoneticHint: '普華／普通 卡。咪 呀 內楠 替 買貪害 汪 買卡？',
      },
      vi: {
        text: 'Mình bị đau đầu / đau bụng nhẹ, có thuốc nào không gây buồn ngủ không ạ?',
        romanization: 'Co thuoc nao khong gay buon ngu khong a?',
        phoneticHint: '勾 脫 腦 空 給 奔五 空阿？',
      },
      fr: {
        text: 'Bonjour, j’ai mal à la tête / à l’estomac. Avez-vous un médicament qui ne fait pas dormir ?',
        romanization: 'J’ai mal à la tête / à l’estomac.',
        phoneticHint: '九 媽 阿 拉 貼特／阿 蕾斯頭媽',
      },
      es: {
        text: 'Disculpe, tengo dolor de cabeza / estómago. ¿Tiene algún medicamento que no dé sueño?',
        romanization: 'Tengo dolor de cabeza / estómago.',
        phoneticHint: '天狗 兜樓 得 卡杯薩／欸斯頭媽狗',
      },
      de: {
        text: 'Entschuldigung, ich habe Kopfschmerzen / Magenschmerzen. Haben Sie ein Medikament, das nicht müde macht?',
        romanization: 'Ich habe Kopfschmerzen / Magenschmerzen.',
        phoneticHint: '伊許 哈本 口普夫史梅森／媽跟史梅森',
      },
    },
  },

  // 📸 拍照＆禮貌社交
  {
    id: 'soc-take-photo',
    category: 'social',
    zhText: '不好意思，請問方便幫我們拍張照嗎？按這個圓形按鈕就可以了，謝謝！',
    note: '景點請路人幫忙拍照',
    translations: {
      ja: {
        text: 'すみません、写真を撮っていただけませんか？この丸いボタンを押すだけで大丈夫です。ありがとうございます！',
        romanization: 'Sumimasen, shashin o totte itadakemasen ka? Arigatou gozaimasu!',
        phoneticHint: '斯咪媽線，瞎新 歐 偷貼 伊塔達K媽線卡？阿哩嘎偷 勾災伊媽斯！',
      },
      ko: {
        text: '저기요, 사진 좀 찍어 주실 수 있나요? 이 동그란 버튼만 누르시면 돼요. 감사합니다!',
        romanization: 'Jeogiyo, sajin jom jjigeo jusil su innayo? Gamsahamnida!',
        phoneticHint: '揪gi唷，撒金 炯 幾勾 朱希 蘇 伊那唷？康撒哈咪達！',
      },
      en: {
        text: 'Excuse me, could you please take a photo for us? Just press this round button. Thank you so much!',
        romanization: 'Could you please take a photo for us?',
        phoneticHint: '苦德 優 普利斯 貼克 額 否頭 否 阿斯？',
      },
      th: {
        text: 'ขอโทษนะคะ ช่วยถ่ายรูปให้หน่อยได้ไหมคะ? กดปุ่มกลมๆ นี้ได้เลยค่ะ ขอบคุณมากค่ะ!',
        romanization: 'Chuai thai rup hai noi dai mai kha? Khop khun mak kha!',
        phoneticHint: '吹 台路 害餒 戴買卡？口坤媽卡！',
      },
      vi: {
        text: 'Xin lỗi, bạn chụp giúp tụi mình một tấm ảnh được không? Cảm ơn bạn nhiều!',
        romanization: 'Ban chup giup tui minh mot tam anh duoc khong?',
        phoneticHint: '板 啾 祖 對明 某 單安 得空？',
      },
      fr: {
        text: 'Excusez-moi, pourriez-vous nous prendre en photo, s’il vous plaît ? Merci beaucoup !',
        romanization: 'Pourriez-vous nous prendre en photo ?',
        phoneticHint: '普哩耶夫 努 胖德 昂 否頭？梅西 波苦！',
      },
      es: {
        text: 'Disculpe, ¿nos podría tomar una foto, por favor? ¡Muchas gracias!',
        romanization: '¿Nos podría tomar una foto, por favor?',
        phoneticHint: '弄斯 破德里呀 頭媽 烏那 否頭？母洽斯 葛拉希亞斯！',
      },
      de: {
        text: 'Entschuldigung, könnten Sie bitte ein Foto von uns machen? Vielen Dank!',
        romanization: 'Könnten Sie bitte ein Foto von uns machen?',
        phoneticHint: '肯騰 茲 筆特 愛 否頭 鳳 溫斯 媽狠？',
      },
    },
  },

  // 🆘 緊急求助＆遺失
  {
    id: 'emg-lost-item',
    category: 'emergency',
    zhText: '不好意思，我的手機／錢包／護照剛才不小心掉在這裡了，請問有人撿到嗎？',
    note: '遺失物品緊急詢問',
    translations: {
      ja: {
        text: 'すみません、先ほどここでスマホ（財布／パスポート）を落としてしまったのですが、届いていませんか？',
        romanization: 'Sumimasen, koko de sumaho / saifu / pasupooto o otoshite shimatta no desu ga, todoite imasen ka?',
        phoneticHint: '斯咪媽線，口口 得 斯媽後（塞胡／帕斯破頭）歐 歐偷希貼 希媽塔，偷兜伊貼 伊媽線卡？',
      },
      ko: {
        text: '저기요, 방금 여기서 휴대폰(지갑/여권)을 잃어버렸는데 혹시 들어온 분실물이 있나요?',
        romanization: 'Banggeum yeogiseo hyudaepon(jigap/yeogwon)-eul ireobeoryeonneunde bunsilmuri innayo?',
        phoneticHint: '邦跟 唷gi搜 休得碰（吉嘎／唷光）伊樓波溜嫩爹，奔希母哩 伊那唷？',
      },
      en: {
        text: 'Excuse me, I just lost my phone / wallet / passport around here. Has anyone turned it in to lost and found?',
        romanization: 'I lost my phone / wallet / passport. Has anyone turned it in?',
        phoneticHint: '愛 樓斯特 買 鳳／挖蕾特／帕斯破特',
      },
      th: {
        text: 'ขอโทษนะคะ ทำโทรศัพท์ (กระเป๋าสตางค์ / พาสปอร์ต) หายแถวนี้ค่ะ มีคนเก็บได้ไหมคะ?',
        romanization: 'Tham thorasap / krapao satang / passport hai thaeo ni kha.',
        phoneticHint: '貪 偷拉薩（嘎包薩當／Passport）海 挑尼卡',
      },
      vi: {
        text: 'Xin lỗi, mình vừa làm rơi điện thoại / ví / hộ chiếu ở đây, có ai nhặt được không ạ?',
        romanization: 'Minh vua lam roi dien thoai / vi / ho chieu o day.',
        phoneticHint: '明 弗 藍雷 點懷／比／後就 歐得',
      },
      fr: {
        text: 'Excusez-moi, je viens de perdre mon téléphone / portefeuille / passeport ici. L’avez-vous trouvé ?',
        romanization: 'Je viens de perdre mon téléphone / portefeuille / passeport.',
        phoneticHint: '九 飛安 得 佩德 猛 貼蕾鳳／破特飛／帕斯破',
      },
      es: {
        text: 'Disculpe, acabo de perder mi teléfono / billetera / pasaporte aquí. ¿Alguien lo ha entregado?',
        romanization: 'Acabo de perder mi teléfono / billetera / pasaporte.',
        phoneticHint: '阿卡波 得 佩得 咪 貼蕾否弄／比耶貼拉／帕薩破貼',
      },
      de: {
        text: 'Entschuldigung, ich habe gerade mein Handy / meinen Geldbeutel / meinen Reisepass hier verloren. Wurde etwas abgegeben?',
        romanization: 'Ich habe mein Handy / meinen Reisepass verloren.',
        phoneticHint: '伊許 哈本 買 韓迪／買嫩 來澤帕斯 飛樓冷',
      },
    },
  },
];

export const DEMO_MENU_SESSIONS: Record<'ja_izakaya' | 'ko_bbq' | 'fr_bistro', Omit<MenuScanSession, 'id' | 'createdAt' | 'updatedAt'>> = {
  ja_izakaya: {
    title: '🇯🇵 東京新宿・炭火串燒居酒屋菜單',
    lang: 'ja',
    selectedNotes: ['no-green-onion'],
    items: [
      {
        id: 'dish-ja-1',
        originalName: '特選和牛カルビ串（2本）',
        translatedZh: '特選和牛牛五花串（2串）',
        romanization: 'Tokusen Wagyuu Karubi Kushi',
        descriptionZh: '鹿兒島 A5 黑毛和牛炭火鹽烤',
        priceForeign: 1280,
        dietaryWarning: '🐄 含牛肉',
        quantity: 1,
      },
      {
        id: 'dish-ja-2',
        originalName: '名物！明太チーズ玉子焼き',
        translatedZh: '招牌明太子起司厚蛋燒',
        romanization: 'Meibutsu! Mentai Chiizu Tamagoyaki',
        descriptionZh: '現煎高湯玉子燒淋博多明太子醬',
        priceForeign: 780,
        quantity: 1,
      },
      {
        id: 'dish-ja-3',
        originalName: '炭火焼き鳥盛り合わせ（5本）',
        translatedZh: '主廚綜合炭火烤雞肉串（5串）',
        romanization: 'Sumibi Yakitori Moriawase',
        descriptionZh: '雞腿、雞蔥串、雞肉丸、雞翅、雞軟骨',
        priceForeign: 1150,
        quantity: 1,
      },
      {
        id: 'dish-ja-4',
        originalName: '生レモンサワー / ウーロン茶',
        translatedZh: '鮮榨檸檬沙瓦 ／ 冰烏龍茶',
        romanization: 'Nama Remon Sawaa / Uuroncha',
        descriptionZh: '可備註去冰或無酒精烏龍茶',
        priceForeign: 550,
        quantity: 2,
      },
    ],
  },
  ko_bbq: {
    title: '🇰🇷 首爾弘大・韓式烤豬五花＆大醬湯',
    lang: 'ko',
    selectedNotes: ['less-spicy'],
    items: [
      {
        id: 'dish-ko-1',
        originalName: '숙성 통삼겹살 (180g)',
        translatedZh: '熟成厚切烤豬五花肉 (180g)',
        romanization: 'Sukseong Tong-samgyeopsal',
        descriptionZh: '店員代烤厚切濟州黑豬五花（附生菜泡菜）',
        priceForeign: 17000,
        quantity: 2,
      },
      {
        id: 'dish-ko-2',
        originalName: '해물 된장찌개 + 공기밥',
        translatedZh: '海鮮大醬湯 ＋ 白飯',
        romanization: 'Haemul Doenjang-jjigae + Gonggibap',
        descriptionZh: '微辣濃郁韓式味噌海鮮豆腐鍋',
        priceForeign: 9000,
        quantity: 1,
      },
      {
        id: 'dish-ko-3',
        originalName: '치즈 계란찜',
        translatedZh: '起司火山蒸蛋',
        romanization: 'Chijeu Gyeranjjim',
        descriptionZh: '完全不辣、蓬鬆牽絲韓式砂鍋蒸蛋',
        priceForeign: 7000,
        quantity: 1,
      },
    ],
  },
  fr_bistro: {
    title: '🇫🇷 巴黎瑪黑區・法式小酒館今日特餐',
    lang: 'fr',
    selectedNotes: [],
    items: [
      {
        id: 'dish-fr-1',
        originalName: 'Confit de Canard & Pommes Sarladaises',
        translatedZh: '法式油封鴨腿佐蒜香煎馬鈴薯',
        romanization: 'Confit de Canard',
        descriptionZh: '西南法經典脆皮油封鴨腿',
        priceForeign: 24,
        quantity: 1,
      },
      {
        id: 'dish-fr-2',
        originalName: 'Soupe à l’Oignon Gratinée',
        translatedZh: '法式焗烤康堤起司洋蔥湯',
        romanization: 'Soupe a l’oignon gratinee',
        descriptionZh: '濃郁焦糖洋蔥牛肉高湯鋪法國麵包焗烤',
        priceForeign: 12,
        quantity: 1,
      },
      {
        id: 'dish-fr-3',
        originalName: 'Carafe d’eau & Crème Brûlée',
        translatedZh: '免費桌上冷水壺 ＆ 香草焦糖烤布蕾',
        romanization: 'Carafe d’eau & Creme Brulee',
        descriptionZh: '法國餐廳說 Carafe d’eau 即可享免費飲用水',
        priceForeign: 9,
        quantity: 1,
      },
    ],
  },
};

export function buildSeedCustomPhrases(): CustomPhraseCard[] {
  const now = 1000;
  return [
    {
      id: 'seed-hotel-card',
      category: 'custom',
      lang: 'ja',
      zhText: '🚕 給計程車司機看：請載我到這間飯店，謝謝！',
      foreignText: '運転手さん、このホテルまでお願いします。ありがとうございます！',
      romanization: 'Untenshu-san, kono hoteru made onegaishimasu.',
      phoneticHint: '溫天修桑，口弄 Hotel 媽得 歐內嘎伊希媽斯',
      note: '可在設定或點擊編輯換成妳這次住的飯店地址',
      pinned: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-dietary-card',
      category: 'custom',
      lang: 'ja',
      zhText: '🚫 個人忌口卡：請不要加蔥、不要香菜，謝謝！',
      foreignText: 'すみません、ネギとパクチーは抜きでお願いします。',
      romanization: 'Sumimasen, negi to pakuchii wa nuki de onegaishimasu.',
      phoneticHint: '斯咪媽線，內gi 偷 帕苦七 哇 努ki 得 歐內嘎伊希媽斯',
      note: '點餐時直接放大給店員看最安心',
      pinned: true,
      createdAt: now - 10,
      updatedAt: now - 10,
    },
  ];
}
