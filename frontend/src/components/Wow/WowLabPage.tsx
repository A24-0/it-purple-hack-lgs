import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { APP_NAME } from '../../config/app';
import styles from './WowLabPage.module.css';

type ProfileQuestion = {
  id: string;
  question: string;
  options: { label: string; score: number }[];
};

type CoverageTip = {
  risk: string;
  covered: string;
  policy: string;
  level: 'high' | 'medium' | 'low';
};

type TmPrediction = {
  className: string;
  probability: number;
};

/** COCO-SSD: рамки вокруг объектов на кадре */
type ArDetection = {
  bbox: [number, number, number, number];
  class: string;
  score: number;
};

type CocoDetectModel = {
  detect: (
    img: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    maxNumBoxes?: number,
    minScore?: number
  ) => Promise<ArDetection[]>;
};

type MobilenetModel = {
  classify: (
    img: HTMLImageElement | HTMLCanvasElement,
    topk?: number
  ) => Promise<TmPrediction[]>;
};

const COCO_LABEL_RU: Record<string, string> = {
  person: 'Человек',
  bicycle: 'Велосипед',
  car: 'Автомобиль',
  motorcycle: 'Мотоцикл',
  bus: 'Автобус',
  truck: 'Грузовик',
  'cell phone': 'Телефон',
  laptop: 'Ноутбук',
  backpack: 'Рюкзак',
  handbag: 'Сумка',
  suitcase: 'Чемодан',
  tv: 'Телевизор',
  couch: 'Диван',
  chair: 'Стул',
  clock: 'Часы',
  book: 'Книга',
  cup: 'Кружка',
  bottle: 'Бутылка',
  dog: 'Собака',
  cat: 'Кошка',
  bed: 'Кровать',
  'dining table': 'Стол',
  'potted plant': 'Растение',
  vase: 'Ваза',
  sink: 'Раковина',
  refrigerator: 'Холодильник',
  microwave: 'Микроволновка',
  oven: 'Духовка',
  keyboard: 'Клавиатура',
  mouse: 'Мышь',
  remote: 'Пульт',
  scissors: 'Ножницы',
  toothbrush: 'Зубная щётка',
};

function cocoLabelRu(en: string): string {
  const k = en.toLowerCase();
  return COCO_LABEL_RU[k] ?? en.charAt(0).toUpperCase() + en.slice(1);
}

async function getCameraStream(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
    { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
    { video: true, audio: false },
  ];
  let lastErr: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Камера недоступна');
}

const TFJS_WASM_VER = '4.22.0';

/**
 * TensorFlow.js: setBackend возвращает false при сбое (не только throw) — иначе
 * выходили «успешно» с невалидным бэкендом. Порядок: WebGL → WASM (Safari/iOS) → CPU.
 */
async function ensureTfBackend(): Promise<void> {
  const tf = await import('@tensorflow/tfjs');

  try {
    const wasm = await import('@tensorflow/tfjs-backend-wasm');
    wasm.setWasmPaths(
      `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${TFJS_WASM_VER}/dist/`
    );
  } catch {
    /* пакет опционален */
  }

  const tryBackend = async (name: string): Promise<boolean> => {
    try {
      const ok = await tf.setBackend(name);
      if (!ok) return false;
      await tf.ready();
      return tf.getBackend() === name;
    } catch {
      return false;
    }
  };

  for (const name of ['webgl', 'wasm', 'cpu'] as const) {
    if (await tryBackend(name)) return;
  }

  throw new Error('Не удалось инициализировать анализ изображения');
}

/** COCO-SSD: чаще кадр — тяжелее; minScore ниже — больше объектов */
const AR_QUALITY_PRESETS = {
  low: { inferIntervalMs: 950, minScore: 0.32, maxBoxes: 12 },
  balanced: { inferIntervalMs: 600, minScore: 0.42, maxBoxes: 18 },
  high: { inferIntervalMs: 400, minScore: 0.52, maxBoxes: 22 },
} as const;

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    readonly [index: number]: { transcript: string };
  }>;
};

type BrowserSpeechWindow = Window & {
  SpeechRecognition?: new () => {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    start: () => void;
    stop: () => void;
  };
  webkitSpeechRecognition?: new () => {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    start: () => void;
    stop: () => void;
  };
};

const profileQuestions: ProfileQuestion[] = [
  {
    id: 'transport',
    question: 'Как часто ты пользуешься самокатом/велосипедом/скутером?',
    options: [
      { label: 'Почти каждый день', score: 3 },
      { label: 'Пару раз в неделю', score: 2 },
      { label: 'Редко', score: 1 },
    ],
  },
  {
    id: 'travel',
    question: 'Как часто ты путешествуешь или ездишь на выезды?',
    options: [
      { label: 'Часто, каждый сезон', score: 3 },
      { label: '1-2 раза в год', score: 2 },
      { label: 'Почти не езжу', score: 1 },
    ],
  },
  {
    id: 'gadgets',
    question: 'Насколько дорогие у тебя гаджеты (телефон, ноутбук, наушники)?',
    options: [
      { label: 'Дорогие и много', score: 3 },
      { label: 'Средние', score: 2 },
      { label: 'Бюджетные', score: 1 },
    ],
  },
  {
    id: 'savings',
    question: 'Есть ли у тебя финансовая подушка на форс-мажор?',
    options: [
      { label: 'Почти нет', score: 3 },
      { label: 'Есть немного', score: 2 },
      { label: 'Есть хороший запас', score: 1 },
    ],
  },
  {
    id: 'health',
    question: 'Насколько активный у тебя образ жизни?',
    options: [
      { label: 'Экстрим и спорт часто', score: 3 },
      { label: 'Умеренно активный', score: 2 },
      { label: 'Спокойный', score: 1 },
    ],
  },
];

const rouletteEvents = [
  { title: 'Сломал велосипед', loss: 8000, type: 'property' },
  { title: 'Заболел в поездке', loss: 45000, type: 'travel' },
  { title: 'Украли рюкзак', loss: 12000, type: 'property' },
  { title: 'Разбил экран телефона', loss: 16000, type: 'gadget' },
  { title: 'Потерял багаж', loss: 21000, type: 'travel' },
  { title: 'Травма на катке', loss: 27000, type: 'health' },
];

/** Ключи состояния чекбоксов — на экране только русские подписи */
const ROULETTE_INSURANCE_LABELS: Record<'property' | 'travel' | 'health' | 'gadget', string> = {
  property: 'Имущество',
  travel: 'Поездки',
  health: 'Здоровье',
  gadget: 'Гаджеты',
};

const voiceKnowledge: { keywords: string[]; tip: CoverageTip }[] = [
  {
    keywords: ['телефон', 'смартфон', 'экран', 'уронил', 'бассейн', 'вода'],
    tip: {
      risk: 'Повреждение гаджета',
      covered: 'Частично покрывается при наличии страхования техники',
      policy: 'Полис на электронику / расширенная гарантия',
      level: 'high',
    },
  },
  {
    keywords: ['болел', 'врач', 'госпиталь', 'турции', 'поездке', 'поездка'],
    tip: {
      risk: 'Медицинские расходы в поездке',
      covered: 'Обычно покрывается туристической страховкой',
      policy: 'Страховка путешественника',
      level: 'high',
    },
  },
  {
    keywords: ['украли', 'кража', 'рюкзак', 'ноутбук', 'вещи'],
    tip: {
      risk: 'Кража имущества',
      covered: 'Зависит от условий договора и подтверждения события',
      policy: 'Имущественная страховка',
      level: 'medium',
    },
  },
];

function getVoiceTip(rawText: string): CoverageTip {
  const text = rawText.toLowerCase();
  for (const item of voiceKnowledge) {
    if (item.keywords.some((word) => text.includes(word))) {
      return item.tip;
    }
  }
  return {
    risk: 'Смешанный или нестандартный риск',
    covered: 'Нужно уточнить детали: место, обстоятельства, документы',
    policy: 'Комбинация: здоровье + имущество + поездки',
    level: 'low',
  };
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(value);
}

/** Тема страхования → цвет рамки в AR и подсказки */
type InsuranceTheme =
  | 'gadget'
  | 'auto'
  | 'sport_mobility'
  | 'property'
  | 'travel'
  | 'health'
  | 'pet'
  | 'sport'
  | 'other';

const THEME_VISUAL: Record<
  InsuranceTheme,
  { stroke: string; fill: string; glow: string; labelBg: string; labelText: string; name: string }
> = {
  gadget: {
    name: 'Гаджеты',
    stroke: '#2563eb',
    fill: 'rgba(37, 99, 235, 0.22)',
    glow: 'rgba(96, 165, 250, 0.95)',
    labelBg: '#1e3a8a',
    labelText: '#eff6ff',
  },
  auto: {
    name: 'Авто / транспорт',
    stroke: '#dc2626',
    fill: 'rgba(220, 38, 38, 0.2)',
    glow: 'rgba(248, 113, 113, 0.9)',
    labelBg: '#7f1d1d',
    labelText: '#fef2f2',
  },
  sport_mobility: {
    name: 'Мототехника',
    stroke: '#ea580c',
    fill: 'rgba(234, 88, 12, 0.2)',
    glow: 'rgba(251, 146, 60, 0.9)',
    labelBg: '#7c2d12',
    labelText: '#fff7ed',
  },
  property: {
    name: 'Имущество / дом',
    stroke: '#ca8a04',
    fill: 'rgba(202, 138, 4, 0.2)',
    glow: 'rgba(250, 204, 21, 0.85)',
    labelBg: '#713f12',
    labelText: '#fffbeb',
  },
  travel: {
    name: 'Багаж / поездки',
    stroke: '#0d9488',
    fill: 'rgba(13, 148, 136, 0.2)',
    glow: 'rgba(45, 212, 191, 0.9)',
    labelBg: '#115e59',
    labelText: '#f0fdfa',
  },
  health: {
    name: 'Здоровье / НС',
    stroke: '#16a34a',
    fill: 'rgba(22, 163, 74, 0.2)',
    glow: 'rgba(74, 222, 128, 0.9)',
    labelBg: '#14532d',
    labelText: '#f0fdf4',
  },
  pet: {
    name: 'Питомцы',
    stroke: '#db2777',
    fill: 'rgba(219, 39, 119, 0.2)',
    glow: 'rgba(244, 114, 182, 0.9)',
    labelBg: '#831843',
    labelText: '#fdf2f8',
  },
  sport: {
    name: 'Спорт',
    stroke: '#9333ea',
    fill: 'rgba(147, 51, 234, 0.2)',
    glow: 'rgba(192, 132, 252, 0.9)',
    labelBg: '#581c87',
    labelText: '#faf5ff',
  },
  other: {
    name: 'Прочее',
    stroke: '#64748b',
    fill: 'rgba(100, 116, 139, 0.2)',
    glow: 'rgba(148, 163, 184, 0.85)',
    labelBg: '#1e293b',
    labelText: '#f8fafc',
  },
};

type InsuranceAdvice = {
  theme: InsuranceTheme;
  categoryRu: string;
  insureWhat: string;
  policyType: string;
  theftRisk: string;
  damageRisk: string;
  stroke: string;
  fill: string;
  glow: string;
  labelBg: string;
  labelText: string;
};

/**
 * Единая логика: классы COCO + подписи ImageNet → что застраховать и какой полис.
 */
function getInsuranceAdvice(rawLabel: string): InsuranceAdvice {
  const key = rawLabel.toLowerCase().trim();

  const finish = (
    theme: InsuranceTheme,
    categoryRu: string,
    insureWhat: string,
    policyType: string,
    theftRisk: string,
    damageRisk: string
  ): InsuranceAdvice => {
    const v = THEME_VISUAL[theme];
    return {
      theme,
      categoryRu,
      insureWhat,
      policyType,
      theftRisk,
      damageRisk,
      stroke: v.stroke,
      fill: v.fill,
      glow: v.glow,
      labelBg: v.labelBg,
      labelText: v.labelText,
    };
  };

  /* --- COCO (основные объекты) --- */
  if (key === 'cell phone') {
    return finish('gadget', 'Мобильный телефон', 'Смартфон / связь', 'Полис на электронику (гаджеты), риск кражи и падения', 'Высокий', 'Высокий');
  }
  if (key === 'laptop') {
    return finish('gadget', 'Ноутбук', 'Портативный ПК', 'Страхование техники, расширение от кражи и залития', 'Высокий', 'Средний');
  }
  if (key === 'tv' || key === 'keyboard' || key === 'mouse' || key === 'remote') {
    return finish('gadget', 'Техника для дома', 'Электроника', 'Имущественное + страхование бытовой техники', 'Средний', 'Средний');
  }
  if (['car', 'bus', 'truck', 'train', 'airplane', 'boat', 'motorcycle'].includes(key)) {
    return finish('auto', 'Транспорт', 'Транспортное средство', 'ОСАГО / КАСКО / страхование водного или авиа', 'Средний', 'Высокий');
  }
  if (key === 'bicycle') {
    return finish('sport', 'Велосипед', 'Велосипед / активный отдых', 'Имущество + спортивные риски (травмы, поломка)', 'Высокий', 'Средний');
  }
  if (['backpack', 'handbag', 'suitcase'].includes(key)) {
    return finish('travel', 'Сумка / багаж', 'Личные вещи в поездке', 'Страхование багажа и имущества путешественника', 'Высокий', 'Средний');
  }
  if (key === 'person') {
    return finish('health', 'Человек', 'Здоровье и безопасность', 'ДМС / НС / страхование от несчастных случаев', 'Низкий', 'Средний');
  }
  if (['dog', 'cat', 'bird', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe'].includes(key)) {
    return finish('pet', 'Животное', 'Питомец', 'Ветеринария / ответственность владельца', 'Низкий', 'Средний');
  }
  if (
    ['couch', 'chair', 'bed', 'dining table', 'toilet', 'sink', 'refrigerator', 'microwave', 'oven', 'potted plant', 'vase', 'clock', 'book', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'].includes(key)
  ) {
    return finish('property', 'Интерьер / быт', 'Имущество в помещении', 'Имущественное страхование квартиры / дома', 'Средний', 'Средний');
  }
  if (['frisbee', 'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket'].includes(key)) {
    return finish('sport', 'Спортинвентарь', 'Спорт и активности', 'Спортивные риски + страхование снаряжения', 'Средний', 'Высокий');
  }
  if (['traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench'].includes(key)) {
    return finish('other', 'Уличный объект', 'Городская среда', 'Гражданская ответственность / общее имущество', 'Низкий', 'Низкий');
  }

  /* --- ImageNet и прочие строки (по ключевым словам) --- */
  if (
    key.includes('cellular') ||
    key.includes('iphone') ||
    key.includes('telephone') ||
    key.includes('phone') ||
    key.includes('radio') ||
    key.includes('modem') ||
    key.includes('ipad') ||
    key.includes('ipod')
  ) {
    return finish('gadget', 'Электроника', 'Гаджет / связь', 'Полис на электронику и кражу', 'Высокий', 'Высокий');
  }
  if (key.includes('laptop') || key.includes('notebook') || key.includes('desktop') || key.includes('monitor') || key.includes('computer') || key.includes('screen') || key.includes('keyboard')) {
    return finish('gadget', 'Компьютерная техника', 'ПК / периферия', 'Страхование электроники', 'Средний', 'Средний');
  }
  if (
    key.includes('screwdriver') ||
    key.includes('hammer') ||
    key.includes('drill') ||
    key.includes('carpenter') ||
    key.includes('pliers') ||
    key.includes('corkscrew') ||
    key.includes('can opener') ||
    key.includes('letter opener') ||
    key.includes('hatchet') ||
    key.includes('shovel') ||
    key.includes('power tool')
  ) {
    return finish(
      'property',
      'Инструменты',
      'Ручной / электроинструмент',
      'Имущественное страхование (инструменты в доме/гараже)',
      'Средний',
      'Средний'
    );
  }
  if (key.includes('backpack') || key.includes('mailbag') || key.includes('purse') || key.includes('wallet') || key.includes('suitcase')) {
    return finish('travel', 'Сумки и багаж', 'Личные вещи', 'Страхование багажа и имущества в поездке', 'Высокий', 'Средний');
  }
  if (
    key.includes('bicycle') ||
    key.includes('unicycle') ||
    key.includes('mountain bike') ||
    key.includes('tricycle')
  ) {
    return finish('sport', 'Двухколёсный транспорт', 'Велосипед', 'Имущество + спортивные риски', 'Высокий', 'Средний');
  }
  if (key.includes('motor') || key.includes('moped') || key.includes('scooter') || key.includes('ambulance') || key.includes('minivan') || key.includes('police van')) {
    return finish('sport_mobility', 'Мототехника / авто', 'Транспорт', 'КАСКО / ОСАГО / мотострахование', 'Средний', 'Высокий');
  }
  if (key.includes('car') || key.includes('jeep') || key.includes('limousine') || key.includes('convertible') || key.includes('racer') || key.includes('school bus') || key.includes('trailer truck') || key.includes('tow truck')) {
    return finish('auto', 'Автомобиль', 'Легковой / коммерческий транспорт', 'ОСАГО, КАСКО, доп. оборудование', 'Средний', 'Высокий');
  }
  if (key.includes('dog') || key.includes('cat') || key.includes('retriever') || key.includes('terrier') || key.includes('spaniel') || key.includes('siamese') || key.includes('tabby') || key.includes('puppy') || key.includes('kitten')) {
    return finish('pet', 'Животное', 'Питомец', 'Ветстрахование / ответственность', 'Низкий', 'Средний');
  }
  if (key.includes('ball') || key.includes('tennis') || key.includes('rugby') || key.includes('soccer') || key.includes('baseball')) {
    return finish('sport', 'Спорт', 'Спортивный инвентарь', 'Спортивные риски и снаряжение', 'Средний', 'Высокий');
  }
  if (key.includes('mask') || key.includes('bandage') || key.includes('dentist') || key.includes('doctor') || key.includes('nurse') || key.includes('hospital')) {
    return finish('health', 'Медицина', 'Здоровье', 'ДМС / страхование от болезней', 'Низкий', 'Средний');
  }
  if (key.includes('chair') || key.includes('table') || key.includes('desk') || key.includes('cabinet') || key.includes('wardrobe') || key.includes('bookcase') || key.includes('apron') || key.includes('iron') || key.includes('microwave') || key.includes('oven') || key.includes('refrigerator')) {
    return finish('property', 'Дом / мебель', 'Имущество дома', 'Имущественное страхование', 'Средний', 'Средний');
  }

  return finish('other', rawLabel, 'Объект общего назначения', 'Уточните у страховщика: имущество / ответственность', 'Средний', 'Средний');
}

function detectionBoxArea(det: ArDetection): number {
  const [, , w, h] = det.bbox;
  return Math.max(1, w * h);
}

function drawArDetections(ctx: CanvasRenderingContext2D, w: number, h: number, detections: ArDetection[]) {
  const scale = Math.min(w, h);
  const lineOuter = Math.max(3, Math.round(scale / 220));
  const lineInner = Math.max(2, lineOuter - 1);
  const fontMain = Math.max(14, Math.round(scale / 48));
  const fontSub = Math.max(11, Math.round(fontMain * 0.78));

  for (const det of detections) {
    const [x, y, bw, bh] = det.bbox;
    if (bw < 2 || bh < 2) continue;

    const adv = getInsuranceAdvice(det.class);
    ctx.save();
    ctx.fillStyle = adv.fill;
    ctx.fillRect(x, y, bw, bh);

    ctx.shadowColor = adv.glow;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = adv.stroke;
    ctx.lineWidth = lineOuter;
    ctx.strokeRect(x, y, bw, bh);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = lineInner;
    ctx.strokeRect(x, y, bw, bh);

    const line1 = `${THEME_VISUAL[adv.theme].name}: ${adv.insureWhat}`;
    const line2 = `${adv.policyType} · ${Math.round(det.score * 100)}%`;
    ctx.font = `bold ${fontMain}px system-ui, -apple-system, sans-serif`;
    const w1 = ctx.measureText(line1).width;
    ctx.font = `600 ${fontSub}px system-ui, -apple-system, sans-serif`;
    const w2 = ctx.measureText(line2).width;
    const pad = 8;
    const textW = Math.min(w - 8, Math.max(w1, w2) + pad * 2);
    const boxH = fontMain + fontSub + pad * 2 + 6;
    let lx = x;
    let ly = y - boxH - 6;
    if (ly < 4) ly = Math.min(y + bh + 6, h - boxH - 4);
    if (lx + textW > w - 4) lx = Math.max(4, w - textW - 4);

    ctx.fillStyle = adv.labelBg;
    ctx.fillRect(lx, ly, textW, boxH);
    ctx.fillStyle = adv.labelText;
    ctx.font = `bold ${fontMain}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(line1, lx + pad, ly + fontMain + pad - 2);
    ctx.font = `600 ${fontSub}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(line2, lx + pad, ly + fontMain + pad + fontSub + 2);
    ctx.restore();
  }
}

type PhotoRiskResult = {
  category: string;
  theftRisk: string;
  damageRisk: string;
  policy: string;
  probability?: number;
  source: 'coco' | 'mobilenet';
  theme: InsuranceTheme;
  insureWhat: string;
  accentStroke: string;
  alternatives?: Array<{ label: string; policy: string; score: number; theme: InsuranceTheme }>;
};

export default function WowLabPage() {
  const [answers, setAnswers] = useState<number[]>(Array(profileQuestions.length).fill(1));
  const [withInsuranceEnabled, setWithInsuranceEnabled] = useState({
    property: true,
    travel: true,
    health: true,
    gadget: true,
  });
  const [rouletteResult, setRouletteResult] = useState<{
    event: string;
    without: number;
    withIns: number;
    saved: number;
  } | null>(null);

  const [voiceText, setVoiceText] = useState('');
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceDraft, setVoiceDraft] = useState('');
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const voiceBufferRef = useRef('');
  const [mnState, setMnState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [arEnabled, setArEnabled] = useState(false);
  const [arError, setArError] = useState<string | null>(null);
  const [arDetections, setArDetections] = useState<ArDetection[]>([]);
  const [cocoState, setCocoState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [arQuality, setArQuality] = useState<keyof typeof AR_QUALITY_PRESETS>('balanced');
  const [arMetrics, setArMetrics] = useState({ fps: 0, inferMs: 0 });
  const [arPerfHint, setArPerfHint] = useState<string | null>(null);
  const [photoRiskResult, setPhotoRiskResult] = useState<PhotoRiskResult | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  /** Пояснение, если TF/модели не поднялись (часто — блокировка CDN Google). */
  const [mlLoadHint, setMlLoadHint] = useState<string | null>(null);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const classifyBusyRef = useRef(false);
  const lastClassifyRef = useRef(0);
  const arDetectionsRef = useRef<ArDetection[]>([]);
  const cocoModelRef = useRef<CocoDetectModel | null>(null);
  const mobilenetRef = useRef<MobilenetModel | null>(null);
  const arPerfHintRef = useRef<string | null>(null);
  const perfRef = useRef({
    frameCount: 0,
    fpsLastTs: 0,
    fpsValue: 0,
    inferAvgMs: 0,
    inferSamples: 0,
  });

  const riskScore = useMemo(() => answers.reduce((sum, value) => sum + value, 0), [answers]);
  const riskProfile = useMemo(() => {
    if (riskScore >= 13) {
      return {
        title: 'Высокий риск-профиль',
        advice:
          'Тебе важно закрыть здоровье в поездках и защиту техники. Начни с базового пакета: путешествия + гаджеты + гражданская ответственность.',
      };
    }
    if (riskScore >= 9) {
      return {
        title: 'Средний риск-профиль',
        advice:
          'У тебя умеренные риски. Оптимально: недорогой пакет на поездки и имущество, плюс небольшая подушка на франшизу.',
      };
    }
    return {
      title: 'Сбалансированный риск-профиль',
      advice:
        'Ты хорошо контролируешь риски, но все равно оставь защиту на критичные сценарии: поездки и дорогую технику.',
    };
  }, [riskScore]);

  const detectedTip = useMemo(() => getVoiceTip(voiceText), [voiceText]);
  arDetectionsRef.current = arDetections;
  arPerfHintRef.current = arPerfHint;

  const handleAnswerChange = (questionIndex: number, score: number) => {
    setAnswers((prev) => prev.map((value, idx) => (idx === questionIndex ? score : value)));
  };

  const handleShareProfile = async () => {
    const text = `Мой результат в ${APP_NAME}: ${riskProfile.title}. Совет: ${riskProfile.advice}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Мой риск-профиль', text });
        return;
      } catch {
        // User can dismiss share sheet.
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      window.alert('Результат скопирован в буфер обмена!');
    } catch {
      window.alert(text);
    }
  };

  const runRoulette = () => {
    const event = rouletteEvents[Math.floor(Math.random() * rouletteEvents.length)];
    const hasCoverage = withInsuranceEnabled[event.type as keyof typeof withInsuranceEnabled];
    const compensation = hasCoverage ? Math.round(event.loss * 0.72) : 0;
    const withIns = Math.max(0, event.loss - compensation);
    setRouletteResult({
      event: event.title,
      without: event.loss,
      withIns,
      saved: event.loss - withIns,
    });
  };

  const toggleVoiceMic = () => {
    if (voiceListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        recognitionRef.current = null;
        setVoiceListening(false);
      }
      return;
    }

    setVoiceError(null);
    const windowWithSpeech = window as BrowserSpeechWindow;
    const SpeechCtor = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
    if (!SpeechCtor) {
      setVoiceError('Голос недоступен в этом браузере.');
      return;
    }

    setVoiceDraft('');
    setVoiceText('');
    voiceBufferRef.current = '';

    const recognition = new SpeechCtor();
    recognitionRef.current = recognition;
    recognition.lang = 'ru-RU';
    recognition.interimResults = false;
    recognition.continuous = true;

    recognition.onstart = () => setVoiceListening(true);
    recognition.onend = () => {
      setVoiceListening(false);
      recognitionRef.current = null;
      const finalText = voiceBufferRef.current.trim();
      if (finalText) {
        setVoiceText(finalText);
        setVoiceDraft(finalText);
      }
    };
    recognition.onerror = () => {
      setVoiceListening(false);
      recognitionRef.current = null;
      setVoiceError('Не получилось записать. Разреши микрофон и попробуй снова.');
    };
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let chunk = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) {
          chunk += event.results[i][0]?.transcript ?? '';
        }
      }
      if (chunk) {
        const prev = voiceBufferRef.current.trim();
        voiceBufferRef.current = prev ? `${prev} ${chunk}`.trim() : chunk;
      }
    };

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setVoiceError('Не удалось включить микрофон.');
    }
  };

  const submitVoiceText = () => {
    setVoiceError(null);
    const t = voiceDraft.trim();
    if (!t) {
      setVoiceText('');
      return;
    }
    setVoiceText(t);
  };

  const handlePhotoAnalyze = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoRiskResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  useEffect(() => {
    let dead = false;
    (async () => {
      setMnState('loading');
      setCocoState('loading');
      setMlLoadHint(null);
      try {
        await ensureTfBackend();
      } catch (e) {
        if (!dead) {
          setCocoState('error');
          setMnState('error');
          setMlLoadHint(
            'Не удалось запустить движок анализа (WebGL / WASM / CPU). Обнови страницу, отключи жёсткий режим приватности для сайта или попробуй Chrome / обновлённый Safari.'
          );
          if (import.meta.env.DEV) console.warn('[WowLab] TF backend', e);
        }
        return;
      }
      if (dead) return;

      const cocoSsd = await import('@tensorflow-models/coco-ssd');
      let cocoOk = false;
      try {
        const cocoLoaded = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        if (!dead) {
          cocoModelRef.current = cocoLoaded as CocoDetectModel;
          setCocoState('ready');
          cocoOk = true;
        }
      } catch (e) {
        if (!dead) {
          cocoModelRef.current = null;
          setCocoState('error');
          if (import.meta.env.DEV) console.warn('[WowLab] COCO-SSD load', e);
        }
      }

      const mobilenetMod = await import('@tensorflow-models/mobilenet');
      let mnOk = false;
      try {
        const loadedMn = await mobilenetMod.load();
        if (!dead) {
          mobilenetRef.current = loadedMn as MobilenetModel;
          setMnState('ready');
          mnOk = true;
        }
      } catch (e) {
        if (!dead) {
          mobilenetRef.current = null;
          setMnState('error');
          if (import.meta.env.DEV) console.warn('[WowLab] MobileNet load', e);
        }
      }

      if (!dead && !cocoOk && !mnOk) {
        setMlLoadHint(
          'Не удалось скачать нейросети: они подгружаются с серверов Google. Проверь интернет, файрвол, VPN или открой сайт с другого подключения. Локальный Docker ML (порт 8001) здесь не используется.'
        );
      }
    })();
    return () => {
      dead = true;
    };
  }, []);

  useLayoutEffect(() => {
    if (!photoPreview) return;
    if (cocoState !== 'ready' && mnState !== 'ready') return;

    let cancelled = false;
    let raf = 0;
    let rafAttempts = 0;
    const maxRafAttempts = 90;

    const runPhotoModels = async (image: HTMLImageElement) => {
      try {
        const coco = cocoModelRef.current;
        if (coco && cocoState === 'ready') {
          const raw = await coco.detect(image, 30, 0.2);
          const decent = raw.filter((d) => d.score >= 0.26);
          if (decent.length > 0) {
            const sorted = [...decent].sort(
              (a, b) =>
                b.score * Math.sqrt(detectionBoxArea(b)) - a.score * Math.sqrt(detectionBoxArea(a))
            );
            const best = sorted[0];
            const adv = getInsuranceAdvice(best.class);
            if (!cancelled) {
              setPhotoRiskResult({
                category: adv.categoryRu,
                theftRisk: adv.theftRisk,
                damageRisk: adv.damageRisk,
                policy: adv.policyType,
                probability: best.score,
                source: 'coco',
                theme: adv.theme,
                insureWhat: adv.insureWhat,
                accentStroke: adv.stroke,
                alternatives: sorted.slice(1, 4).map((d) => {
                  const a = getInsuranceAdvice(d.class);
                  return {
                    label: cocoLabelRu(d.class),
                    policy: a.policyType,
                    score: d.score,
                    theme: a.theme,
                  };
                }),
              });
            }
            return;
          }
        }

        const mn = mobilenetRef.current;
        if (mn && mnState === 'ready') {
          const preds = await mn.classify(image, 5);
          if (preds.length === 0) return;
          let best = preds[0];
          let bestWeighted = -1;
          for (const p of preds) {
            const adv = getInsuranceAdvice(p.className);
            const penalty = adv.theme === 'other' ? 0.38 : 1;
            const w = p.probability * penalty;
            if (w > bestWeighted) {
              bestWeighted = w;
              best = p;
            }
          }
          const adv = getInsuranceAdvice(best.className);
          if (!cancelled) {
            setPhotoRiskResult({
              category: adv.categoryRu,
              theftRisk: adv.theftRisk,
              damageRisk: adv.damageRisk,
              policy: adv.policyType,
              probability: best.probability,
              source: 'mobilenet',
              theme: adv.theme,
              insureWhat: adv.insureWhat,
              accentStroke: adv.stroke,
            });
          }
          return;
        }

        if (!cancelled) setPhotoRiskResult(null);
      } catch {
        const adv = getInsuranceAdvice('unknown');
        if (!cancelled) {
          setPhotoRiskResult({
            category: 'Ошибка анализа',
            theftRisk: '—',
            damageRisk: '—',
            policy: 'Попробуй другое фото или освещение',
            source: 'mobilenet',
            theme: 'other',
            insureWhat: '—',
            accentStroke: adv.stroke,
          });
        }
      }
    };

    const startDecodeAndRun = (image: HTMLImageElement) => {
      const go = () => {
        if (!cancelled) void runPhotoModels(image);
      };
      if (typeof image.decode === 'function') {
        image.decode().then(go).catch(go);
      } else if (image.complete) {
        go();
      } else {
        image.onload = go;
      }
    };

    const waitForImageRef = () => {
      if (cancelled) return;
      const image = imageRef.current;
      if (image) {
        startDecodeAndRun(image);
        return;
      }
      rafAttempts += 1;
      if (rafAttempts > maxRafAttempts) return;
      raf = requestAnimationFrame(waitForImageRef);
    };

    waitForImageRef();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [photoPreview, cocoState, mnState]);

  const stopAr = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    lastClassifyRef.current = 0;
    classifyBusyRef.current = false;
    setArDetections([]);
    arDetectionsRef.current = [];
    setArMetrics({ fps: 0, inferMs: 0 });
    setArPerfHint(null);
  };

  const startAr = async () => {
    if (cocoState === 'loading') {
      setArError('Готовится распознавание объектов — подожди несколько секунд и нажми снова.');
      return;
    }
    if (cocoState === 'error' || !cocoModelRef.current) {
      setArError('Не удалось загрузить распознавание объектов. Обнови страницу или проверь сеть.');
      return;
    }
    setArError(null);
    try {
      const stream = await getCameraStream();
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await new Promise<void>((resolve, reject) => {
          const done = () => {
            video.removeEventListener('loadedmetadata', done);
            video.removeEventListener('error', onErr);
            resolve();
          };
          const onErr = () => {
            video.removeEventListener('loadedmetadata', done);
            video.removeEventListener('error', onErr);
            reject(new Error('video metadata'));
          };
          if (video.readyState >= 1) {
            resolve();
            return;
          }
          video.addEventListener('loadedmetadata', done, { once: true });
          video.addEventListener('error', onErr, { once: true });
        });
        await video.play();
      }
      setArEnabled(true);
      setArPerfHint(null);
      perfRef.current = {
        frameCount: 0,
        fpsLastTs: performance.now(),
        fpsValue: 0,
        inferAvgMs: 0,
        inferSamples: 0,
      };
    } catch {
      setArError('Нет доступа к камере. Разреши доступ в настройках браузера.');
      setArEnabled(false);
    }
  };

  useEffect(() => () => stopAr(), []);

  useEffect(() => {
    if (!arEnabled || !videoRef.current || !canvasRef.current || cocoState !== 'ready') return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const qualityConfig = AR_QUALITY_PRESETS[arQuality];

    const loop = async (time: number) => {
      if (!perfRef.current.fpsLastTs) perfRef.current.fpsLastTs = time;
      perfRef.current.frameCount += 1;
      const fpsElapsed = time - perfRef.current.fpsLastTs;
      if (fpsElapsed >= 1000) {
        perfRef.current.fpsValue = Math.round((perfRef.current.frameCount * 1000) / fpsElapsed);
        perfRef.current.frameCount = 0;
        perfRef.current.fpsLastTs = time;
      }

      if (!video.videoWidth || !video.videoHeight) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const coco = cocoModelRef.current;
      if (
        coco &&
        !classifyBusyRef.current &&
        time - lastClassifyRef.current > qualityConfig.inferIntervalMs
      ) {
        classifyBusyRef.current = true;
        lastClassifyRef.current = time;
        try {
          const inferStart = performance.now();
          const raw = await coco.detect(video, qualityConfig.maxBoxes, qualityConfig.minScore);
          const sorted = [...raw].sort((a, b) => b.score - a.score);
          arDetectionsRef.current = sorted;
          setArDetections(sorted);
          const inferMs = performance.now() - inferStart;
          const p = perfRef.current;
          p.inferSamples += 1;
          p.inferAvgMs = p.inferAvgMs === 0 ? inferMs : p.inferAvgMs * 0.7 + inferMs * 0.3;
          setArMetrics({
            fps: p.fpsValue,
            inferMs: Math.round(p.inferAvgMs * 10) / 10,
          });

          if (arQuality !== 'low' && p.inferSamples >= 4 && (p.fpsValue < 12 || p.inferAvgMs > 450)) {
            setArQuality('low');
            setArPerfHint('Обнаружены просадки: режим автоматически переключен на "Быстро".');
          } else if (p.fpsValue > 22 && p.inferAvgMs < 280 && arQuality === 'low') {
            setArPerfHint('Сейчас стабильно. Можно попробовать "Баланс" для лучшей точности.');
          } else if (!arPerfHintRef.current && p.inferSamples >= 3) {
            setArPerfHint('Цвет рамки показывает тип страхования. Если картинка тормозит — включите режим «Быстро».');
          }
        } catch {
          setArError('Ошибка детекции объектов.');
        } finally {
          classifyBusyRef.current = false;
        }
      }

      drawArDetections(ctx, canvas.width, canvas.height, arDetectionsRef.current);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [arEnabled, arQuality, cocoState]);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.kicker}>Практика</p>
        <h1 className={styles.title}>Лаборатория рисков</h1>
        <p className={styles.subtitle}>
          Расскажи голосом, что случилось, пройди короткий опрос и посмотри, как страховка помогает в жизни.
        </p>
      </header>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>1) Что случилось</h2>
        <p className={styles.cardText}>
          Расскажи голосом (микрофон — второе нажатие останавливает запись) или напиши текст в поле и нажми кнопку отправки — покажем подсказку по риску.
        </p>
        <div className={styles.voiceMicRow}>
          <button
            type="button"
            className={`${styles.micBtn} ${voiceListening ? styles.micBtnActive : ''}`}
            onClick={toggleVoiceMic}
            aria-label={voiceListening ? 'Остановить запись' : 'Начать запись'}
            title={voiceListening ? 'Остановить' : 'Говорить'}
          >
            <svg className={styles.micIcon} viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M19 10v2a7 7 0 0 1-14 0v-2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M12 19v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M8 22h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          {voiceListening && <span className={styles.voiceLive}>Запись…</span>}
        </div>
        <div className={styles.voiceInputWrap}>
          <textarea
            className={styles.voiceInput}
            value={voiceDraft}
            onChange={(e) => setVoiceDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submitVoiceText();
              }
            }}
            placeholder="Напиши, что случилось, или дождись текста с микрофона."
            rows={3}
            aria-label="Описание ситуации"
          />
          <button
            type="button"
            className={styles.sendBtn}
            onClick={submitVoiceText}
            disabled={!voiceDraft.trim()}
            aria-label="Отправить текст и показать подсказку"
            title="Отправить"
          >
            <svg className={styles.sendIcon} viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M22 2 11 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22 2 15 22 11 13 2 9 22 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        {voiceError && <p className={styles.error}>{voiceError}</p>}
        {voiceText && (
          <div className={styles.resultBox}>
            <p>
              <strong>Ситуация:</strong> {voiceText}
            </p>
            <p>
              <strong>Риск:</strong> {detectedTip.risk}
            </p>
            <p>
              <strong>Покрытие:</strong> {detectedTip.covered}
            </p>
            <p>
              <strong>Нужен полис:</strong> {detectedTip.policy}
            </p>
          </div>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>2) Личный риск-профиль (5 вопросов)</h2>
        <div className={styles.qaList}>
          {profileQuestions.map((q, qIdx) => (
            <div key={q.id} className={styles.qaItem}>
              <p className={styles.question}>{qIdx + 1}. {q.question}</p>
              <div className={styles.optionsRow}>
                {q.options.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    className={`${styles.optionBtn} ${answers[qIdx] === option.score ? styles.optionBtnActive : ''}`}
                    onClick={() => handleAnswerChange(qIdx, option.score)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className={styles.resultBox}>
          <p className={styles.profileTitle}>{riskProfile.title}</p>
          <p>{riskProfile.advice}</p>
          <button type="button" className={styles.secondaryBtn} onClick={handleShareProfile}>
            Поделиться результатом
          </button>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>3) Симулятор «Везёт / не везёт»</h2>
        <p className={styles.cardText}>
          Отметь, какие страховки у тебя есть, нажми «Случилось событие» — увидишь убыток без защиты и со страховкой.
        </p>
        <div className={styles.toggleRow}>
          {(Object.keys(withInsuranceEnabled) as Array<keyof typeof withInsuranceEnabled>).map((key) => (
            <label key={key} className={styles.toggleItem}>
              <input
                type="checkbox"
                checked={withInsuranceEnabled[key]}
                onChange={(e) =>
                  setWithInsuranceEnabled((prev) => ({
                    ...prev,
                    [key]: e.target.checked,
                  }))
                }
              />
              <span>{ROULETTE_INSURANCE_LABELS[key]}</span>
            </label>
          ))}
        </div>
        <button type="button" className={styles.primaryBtn} onClick={runRoulette}>
          Случилось событие
        </button>
        {rouletteResult && (
          <div className={styles.resultBox}>
            <p>
              <strong>Событие:</strong> {rouletteResult.event}
            </p>
            <p>
              <strong>Без страховки:</strong> -{formatMoney(rouletteResult.without)} руб.
            </p>
            <p>
              <strong>Со страховкой:</strong> -{formatMoney(rouletteResult.withIns)} руб.
            </p>
            <p className={styles.saveValue}>
              Экономия: {formatMoney(rouletteResult.saved)} руб.
            </p>
          </div>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>4) Фото → анализ риска за 3 секунды</h2>
        <p className={styles.cardText}>
          Загрузи снимок: сначала ищем предметы на фото, если в кадре мало деталей — подсказка строится по общему виду
          снимка. Покажем, что логичнее застраховать и какой тип полиса ближе.
        </p>
        <p className={styles.hint}>
          {cocoState === 'loading' || mnState === 'loading'
            ? 'Готовим распознавание…'
            : cocoState === 'error' && mnState === 'error'
              ? 'Не удалось подготовить анализ. Проверь сеть и обнови страницу.'
              : 'Можно выбрать фото.'}
        </p>
        {mlLoadHint && <p className={styles.error}>{mlLoadHint}</p>}
        <label className={styles.uploadBox}>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoAnalyze}
            disabled={cocoState !== 'ready' && mnState !== 'ready'}
          />
          <span>
            {cocoState === 'ready' || mnState === 'ready'
              ? 'Выбрать фото для анализа'
              : 'Подожди подготовки анализа…'}
          </span>
        </label>
        {photoPreview && <img ref={imageRef} src={photoPreview} alt="preview" className={styles.previewImage} />}
        {photoRiskResult && (
          <div
            className={`${styles.resultBox} ${styles.photoResultCard}`}
            style={{ ['--photo-accent' as string]: photoRiskResult.accentStroke }}
          >
            <span className={styles.photoSourceBadge}>
              {photoRiskResult.source === 'coco' ? 'По контуру предмета' : 'По общему виду снимка'}
            </span>
            <p>
              <strong>Что застраховать:</strong> {photoRiskResult.insureWhat}
            </p>
            <p>
              <strong>Категория:</strong> {photoRiskResult.category}
            </p>
            {typeof photoRiskResult.probability === 'number' && (
              <p>
                <strong>Уверенность:</strong> {Math.round(photoRiskResult.probability * 100)}%
              </p>
            )}
            <p>
              <strong>Вид страхования:</strong> {photoRiskResult.policy}
            </p>
            <p>
              <strong>Риск кражи:</strong> {photoRiskResult.theftRisk} · <strong>повреждения:</strong>{' '}
              {photoRiskResult.damageRisk}
            </p>
            {photoRiskResult.alternatives && photoRiskResult.alternatives.length > 0 && (
              <div className={styles.photoAltList}>
                <strong>Ещё объекты на фото:</strong>
                {photoRiskResult.alternatives.map((alt) => (
                  <div
                    key={`${alt.label}-${alt.score}`}
                    className={styles.photoAltItem}
                    style={{ borderLeft: `4px solid ${THEME_VISUAL[alt.theme].stroke}` }}
                  >
                    {alt.label} — {alt.policy} ({Math.round(alt.score * 100)}%)
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>5) Сканер рисков с камеры</h2>
        <p className={styles.cardText}>
          Наведи камеру: каждый замеченный предмет подсвечивается цветом по типу страхования. На рамке — что имеет смысл
          застраховать и какой полис ближе; списком те же подсказки внизу.
        </p>
        <p className={styles.arCocoStatus}>
          {cocoState === 'loading'
            ? 'Готовим распознавание…'
            : cocoState === 'ready'
              ? 'Распознавание готово'
              : 'Не удалось загрузить распознавание'}
        </p>
        {mlLoadHint && cocoState === 'error' && <p className={styles.error}>{mlLoadHint}</p>}
        <div className={styles.row}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={startAr}
            disabled={arEnabled || cocoState === 'loading'}
          >
            {arEnabled ? 'Сканирую...' : 'Запустить сканер'}
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => {
              stopAr();
              setArEnabled(false);
            }}
            disabled={!arEnabled}
          >
            Остановить
          </button>
        </div>
        <div className={styles.qualityRow}>
          <span className={styles.hint}>Качество:</span>
          <button
            type="button"
            className={`${styles.secondaryBtn} ${arQuality === 'low' ? styles.qualityActive : ''}`}
            onClick={() => setArQuality('low')}
          >
            Быстро
          </button>
          <button
            type="button"
            className={`${styles.secondaryBtn} ${arQuality === 'balanced' ? styles.qualityActive : ''}`}
            onClick={() => setArQuality('balanced')}
          >
            Баланс
          </button>
          <button
            type="button"
            className={`${styles.secondaryBtn} ${arQuality === 'high' ? styles.qualityActive : ''}`}
            onClick={() => setArQuality('high')}
          >
            Точно
          </button>
        </div>
        <div className={styles.metricsRow}>
          <span className={styles.metricBadge}>
            Кадров в секунду: {arMetrics.fps > 0 ? arMetrics.fps : '—'}
          </span>
          <span className={styles.metricBadge}>
            Время анализа кадра:{' '}
            {arMetrics.inferMs > 0 ? `${arMetrics.inferMs} мс` : '—'}
          </span>
        </div>
        {arPerfHint && <p className={styles.perfHint}>{arPerfHint}</p>}
        {arError && <p className={styles.error}>{arError}</p>}
        <div className={styles.arFrame}>
          <video ref={videoRef} className={styles.arVideo} muted playsInline />
          <canvas ref={canvasRef} className={styles.arCanvas} />
        </div>
        {arEnabled && arDetections.length > 0 && (
          <div className={styles.arChipList} aria-live="polite">
            {arDetections.map((d, i) => {
              const adv = getInsuranceAdvice(d.class);
              return (
                <span
                  key={`${d.class}-${i}-${Math.round(d.score * 100)}`}
                  className={styles.arChip}
                  style={{
                    borderColor: adv.stroke,
                    background: `linear-gradient(135deg, ${adv.fill}, rgba(255,255,255,0.85))`,
                    color: 'var(--text-primary)',
                  }}
                >
                  <strong>{THEME_VISUAL[adv.theme].name}</strong>
                  <small>
                    {adv.insureWhat} → {adv.policyType} ({Math.round(d.score * 100)}%)
                  </small>
                </span>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
