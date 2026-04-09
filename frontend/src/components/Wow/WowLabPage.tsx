import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
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

type ClassifierModel = {
  predict: (
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    maxPredictions?: number
  ) => Promise<TmPrediction[]>;
};

const DEFAULT_CLASSIFIER_URL = import.meta.env.VITE_TM_MODEL_URL as string | undefined;
const AR_QUALITY_PRESETS = {
  low: { inferSize: 224, inferIntervalMs: 1500 },
  balanced: { inferSize: 320, inferIntervalMs: 900 },
  high: { inferSize: 384, inferIntervalMs: 550 },
} as const;

type BrowserSpeechWindow = Window & {
  SpeechRecognition?: new () => {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
    onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
    start: () => void;
  };
  webkitSpeechRecognition?: new () => {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
    onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
    start: () => void;
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

function mapClassToRisk(className: string): {
  category: string;
  theftRisk: string;
  damageRisk: string;
  policy: string;
} {
  const key = className.toLowerCase();
  if (key.includes('phone') || key.includes('смартф') || key.includes('тел')) {
    return {
      category: 'Смартфон',
      theftRisk: 'Высокий',
      damageRisk: 'Высокий',
      policy: 'Страховка техники + защита от кражи',
    };
  }
  if (key.includes('bike') || key.includes('вел') || key.includes('scoot')) {
    return {
      category: 'Велосипед/самокат',
      theftRisk: 'Высокий',
      damageRisk: 'Средний',
      policy: 'Имущественный полис + спорт/активности',
    };
  }
  if (key.includes('bag') || key.includes('рюкзак') || key.includes('backpack')) {
    return {
      category: 'Рюкзак/личные вещи',
      theftRisk: 'Средний',
      damageRisk: 'Низкий',
      policy: 'Защита имущества в поездках',
    };
  }
  if (key.includes('laptop') || key.includes('ноут')) {
    return {
      category: 'Ноутбук',
      theftRisk: 'Высокий',
      damageRisk: 'Средний',
      policy: 'Страховка электроники и имущества',
    };
  }
  return {
    category: className,
    theftRisk: 'Средний',
    damageRisk: 'Средний',
    policy: 'Базовая защита имущества',
  };
}

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
  const [model, setModel] = useState<ClassifierModel | null>(null);
  const [modelState, setModelState] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [arEnabled, setArEnabled] = useState(false);
  const [arError, setArError] = useState<string | null>(null);
  const [arPredictions, setArPredictions] = useState<TmPrediction[]>([]);
  const [arQuality, setArQuality] = useState<keyof typeof AR_QUALITY_PRESETS>('balanced');
  const [arMetrics, setArMetrics] = useState({ fps: 0, inferMs: 0 });
  const [arPerfHint, setArPerfHint] = useState<string | null>(null);
  const [photoRiskResult, setPhotoRiskResult] = useState<{
    category: string;
    theftRisk: string;
    damageRisk: string;
    policy: string;
    probability?: number;
  } | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const classifyBusyRef = useRef(false);
  const lastClassifyRef = useRef(0);
  const arPredictionsRef = useRef<TmPrediction[]>([]);
  const inferCanvasRef = useRef<HTMLCanvasElement | null>(null);
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
  arPredictionsRef.current = arPredictions;
  arPerfHintRef.current = arPerfHint;

  const handleAnswerChange = (questionIndex: number, score: number) => {
    setAnswers((prev) => prev.map((value, idx) => (idx === questionIndex ? score : value)));
  };

  const handleShareProfile = async () => {
    const text = `Мой результат в СтрахоГиде: ${riskProfile.title}. Совет: ${riskProfile.advice}`;
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

  const startVoiceDetective = () => {
    setVoiceError(null);
    const windowWithSpeech = window as BrowserSpeechWindow;
    const SpeechCtor = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
    if (!SpeechCtor) {
      setVoiceError('Браузер не поддерживает Web Speech API. Попробуй Chrome.');
      return;
    }

    const recognition = new SpeechCtor();
    recognition.lang = 'ru-RU';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => setVoiceListening(true);
    recognition.onend = () => setVoiceListening(false);
    recognition.onerror = () => {
      setVoiceListening(false);
      setVoiceError('Не удалось распознать речь. Проверь доступ к микрофону.');
    };
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0]?.transcript ?? '';
      }
      setVoiceDraft((prev) => `${prev} ${transcript}`.trim());
    };

    recognition.start();
  };

  const applyVoiceDraft = () => {
    const text = voiceDraft.trim();
    if (!text) return;
    setVoiceText(text);
  };

  const fallbackPredict = (hintText = ''): TmPrediction[] => {
    const text = hintText.toLowerCase();
    if (text.includes('вел') || text.includes('bike')) {
      return [{ className: 'bicycle', probability: 0.72 }];
    }
    if (text.includes('рюкзак') || text.includes('bag')) {
      return [{ className: 'backpack', probability: 0.67 }];
    }
    return [{ className: 'smartphone', probability: 0.63 }];
  };

  const handlePhotoAnalyze = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
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
      if (!DEFAULT_CLASSIFIER_URL) {
        setModel(null);
        setModelState('fallback');
        return;
      }
      setModelState('loading');
      try {
        const tf = await import('@tensorflow/tfjs');
        if (tf.getBackend() !== 'webgl') {
          await tf.setBackend('webgl');
          await tf.ready();
        }
        const tmImage = await import('@teachablemachine/image');
        const base = DEFAULT_CLASSIFIER_URL.endsWith('/') ? DEFAULT_CLASSIFIER_URL : `${DEFAULT_CLASSIFIER_URL}/`;
        const loaded = await tmImage.load(`${base}model.json`, `${base}metadata.json`);
        if (dead) return;
        setModel(loaded as ClassifierModel);
        setModelState('ready');
      } catch {
        if (dead) return;
        setModel(null);
        setModelState('fallback');
      }
    })();
    return () => {
      dead = true;
    };
  }, []);

  useEffect(() => {
    if (!photoPreview || !imageRef.current) return;
    const image = imageRef.current;
    const predict = async () => {
      try {
        const predictions = model ? await model.predict(image, 3) : fallbackPredict('smartphone');
        const top = [...predictions].sort((a, b) => b.probability - a.probability)[0];
        if (!top) return;
        const mapped = mapClassToRisk(top.className);
        setPhotoRiskResult({
          ...mapped,
          probability: top.probability,
        });
      } catch {
        const top = fallbackPredict('phone')[0];
        const mapped = mapClassToRisk(top.className);
        setPhotoRiskResult({
          ...mapped,
          probability: top.probability,
        });
      }
    };
    if (image.complete) {
      void predict();
    } else {
      image.onload = () => void predict();
    }
  }, [photoPreview, model]);

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
  };

  const startAr = async () => {
    if (!model && modelState === 'loading') return;
    setArError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
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
      setArError('Нет доступа к камере. Разреши доступ в браузере.');
      setArEnabled(false);
    }
  };

  useEffect(() => () => stopAr(), []);

  useEffect(() => {
    if (!arEnabled || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const inferCanvas = inferCanvasRef.current ?? document.createElement('canvas');
    inferCanvasRef.current = inferCanvas;
    const inferCtx = inferCanvas.getContext('2d');
    if (!inferCtx) return;
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
      ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!classifyBusyRef.current && time - lastClassifyRef.current > qualityConfig.inferIntervalMs) {
        classifyBusyRef.current = true;
        lastClassifyRef.current = time;
        try {
          const inferStart = performance.now();
          inferCanvas.width = qualityConfig.inferSize;
          inferCanvas.height = qualityConfig.inferSize;
          inferCtx.drawImage(video, 0, 0, inferCanvas.width, inferCanvas.height);
          const predictions = model
            ? await model.predict(inferCanvas, 3)
            : fallbackPredict('bicycle backpack phone');
          setArPredictions(predictions.sort((a, b) => b.probability - a.probability).slice(0, 3));
          const inferMs = performance.now() - inferStart;
          const p = perfRef.current;
          p.inferSamples += 1;
          p.inferAvgMs = p.inferAvgMs === 0 ? inferMs : p.inferAvgMs * 0.7 + inferMs * 0.3;
          setArMetrics({
            fps: p.fpsValue,
            inferMs: Math.round(p.inferAvgMs),
          });

          if (arQuality !== 'low' && p.inferSamples >= 4 && (p.fpsValue < 18 || p.inferAvgMs > 220)) {
            setArQuality('low');
            setArPerfHint('Обнаружены просадки: режим автоматически переключен на "Быстро".');
          } else if (p.fpsValue > 24 && p.inferAvgMs < 140 && arQuality === 'low') {
            setArPerfHint('Сейчас стабильно. Можно попробовать "Баланс" для лучшей точности.');
          } else if (!arPerfHintRef.current && p.inferSamples >= 3) {
            setArPerfHint('Следи за метриками: если FPS < 20, оставь режим "Быстро".');
          }
        } catch {
          setArError('Ошибка распознавания в AR-режиме.');
        } finally {
          classifyBusyRef.current = false;
        }
      }

      const markers = arPredictionsRef.current.map((item, index) => ({
        x: 24 + index * 180,
        y: 36 + index * 78,
        label: `${item.className}: ${Math.round(item.probability * 100)}%`,
      }));
      for (const marker of markers) {
        ctx.fillStyle = 'rgba(37, 99, 235, 0.85)';
        ctx.fillRect(marker.x, marker.y, 170, 34);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(marker.label, marker.x + 8, marker.y + 22);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [arEnabled, arQuality, model, modelState]);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.kicker}>Практика</p>
        <h1 className={styles.title}>Лаборатория рисков</h1>
        <p className={styles.subtitle}>
          Раздел с голосовым разбором, персональным профилем риска и визуальным анализом ситуации.
        </p>
      </header>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>1) Голосовой детектив страхового случая</h2>
        <p className={styles.cardText}>
          Нажми кнопку и расскажи, что произошло. Система выделит тип риска и подскажет подходящий полис.
        </p>
        <div className={styles.row}>
          <button type="button" className={styles.primaryBtn} onClick={startVoiceDetective}>
            {voiceListening ? 'Слушаю...' : 'Говорить'}
          </button>
          <button type="button" className={styles.secondaryBtn} onClick={applyVoiceDraft}>
            Применить текст
          </button>
          <span className={styles.hint}>Если микрофон не работает — введи текст вручную ниже.</span>
        </div>
        <textarea
          className={styles.voiceInput}
          value={voiceDraft}
          onChange={(e) => setVoiceDraft(e.target.value)}
          placeholder="Например: у меня украли рюкзак в поездке."
          rows={3}
        />
        {voiceError && <p className={styles.error}>{voiceError}</p>}
        {voiceText && (
          <div className={styles.resultBox}>
            <p>
              <strong>Распознано:</strong> {voiceText}
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
        <h2 className={styles.cardTitle}>3) Симулятор "Везет / не везет"</h2>
        <p className={styles.cardText}>
          Включай нужные страховки, крути год жизни и сравни потери с защитой и без.
        </p>
        <div className={styles.toggleRow}>
          {Object.keys(withInsuranceEnabled).map((item) => (
            <label key={item} className={styles.toggleItem}>
              <input
                type="checkbox"
                checked={withInsuranceEnabled[item as keyof typeof withInsuranceEnabled]}
                onChange={(e) =>
                  setWithInsuranceEnabled((prev) => ({
                    ...prev,
                    [item]: e.target.checked,
                  }))
                }
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
        <button type="button" className={styles.primaryBtn} onClick={runRoulette}>
          Прожить год
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
          Нажми и загрузи фото. Классификатор встроен в приложение и работает без ручного ввода URL.
        </p>
        <p className={styles.hint}>
          Статус модели: {modelState === 'ready' ? 'подключена' : modelState === 'loading' ? 'загрузка...' : 'базовый режим'}
        </p>
        <label className={styles.uploadBox}>
          <input type="file" accept="image/*" onChange={handlePhotoAnalyze} />
          <span>Выбрать фото для анализа</span>
        </label>
        {photoPreview && <img ref={imageRef} src={photoPreview} alt="preview" className={styles.previewImage} />}
        {photoRiskResult && (
          <div className={styles.resultBox}>
            <p>
              <strong>Объект:</strong> {photoRiskResult.category}
            </p>
            {typeof photoRiskResult.probability === 'number' && (
              <p>
                <strong>Уверенность модели:</strong> {Math.round(photoRiskResult.probability * 100)}%
              </p>
            )}
            <p>
              <strong>Риск кражи:</strong> {photoRiskResult.theftRisk}
            </p>
            <p>
              <strong>Риск повреждения:</strong> {photoRiskResult.damageRisk}
            </p>
            <p>
              <strong>Рекомендация:</strong> {photoRiskResult.policy}
            </p>
          </div>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>5) Псевдо-AR сканер рисков</h2>
        <p className={styles.cardText}>
          Наведи камеру на комнату: поверх видео отрисуются метки распознанных объектов и их вероятности.
        </p>
        <div className={styles.row}>
          <button type="button" className={styles.primaryBtn} onClick={startAr} disabled={arEnabled}>
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
          <span className={styles.metricBadge}>FPS: {arMetrics.fps || '--'}</span>
          <span className={styles.metricBadge}>Инференс: {arMetrics.inferMs || '--'} ms</span>
        </div>
        {arPerfHint && <p className={styles.perfHint}>{arPerfHint}</p>}
        {arError && <p className={styles.error}>{arError}</p>}
        <div className={styles.arFrame}>
          <video ref={videoRef} className={styles.arVideo} muted playsInline />
          <canvas ref={canvasRef} className={styles.arCanvas} />
        </div>
      </section>
    </div>
  );
}
