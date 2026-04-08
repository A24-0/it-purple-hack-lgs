import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import styles from './GuessRiskGame.module.css';
import detectiveStyles from './ClaimDetectiveGame.module.css';
import InstructionBadge from './InstructionBadge';

type Verdict = 'approve' | 'reject' | 'review';

type Evidence = {
  id: string;
  text: string;
  usefulFor: Verdict[];
};

type CaseFile = {
  id: string;
  title: string;
  brief: string;
  verdict: Verdict;
  evidences: Evidence[];
  tip: string;
};

const VERDICTS: { key: Verdict; label: string }[] = [
  { key: 'approve', label: 'Одобрить выплату' },
  { key: 'reject', label: 'Отказать' },
  { key: 'review', label: 'Доп. проверка' },
];

const FILES: CaseFile[] = [
  {
    id: 'f1',
    title: 'Ущерб авто во дворе',
    brief: 'Клиент заявил повреждение бампера ночью. Есть фото и запись с камеры дома.',
    verdict: 'approve',
    tip: 'Повреждение подтверждается, риск входит в полис.',
    evidences: [
      { id: 'e1', text: 'Дата события внутри срока полиса', usefulFor: ['approve'] },
      { id: 'e2', text: 'В договоре исключен риск парковки', usefulFor: ['reject'] },
      { id: 'e3', text: 'Видео подтверждает третье лицо', usefulFor: ['approve'] },
      { id: 'e4', text: 'Не хватает акта осмотра', usefulFor: ['review'] },
      { id: 'e5', text: 'Клиент ранее уже подавал спорный кейс', usefulFor: ['review'] },
    ],
  },
  {
    id: 'f2',
    title: 'Пожар в квартире',
    brief: 'Заявлен страховой случай по имуществу, но экспертиза указывает на умысел.',
    verdict: 'reject',
    tip: 'Умысел страхователя является исключением по договору.',
    evidences: [
      { id: 'e1', text: 'Заключение: очаг создан искусственно', usefulFor: ['reject'] },
      { id: 'e2', text: 'Оплата полиса без просрочек', usefulFor: ['review'] },
      { id: 'e3', text: 'Есть свидетели случайного возгорания', usefulFor: ['review'] },
      { id: 'e4', text: 'Умысел указан как исключение в условиях', usefulFor: ['reject'] },
      { id: 'e5', text: 'Часть документов отсутствует', usefulFor: ['review'] },
    ],
  },
  {
    id: 'f3',
    title: 'Травма в путешествии',
    brief: 'Клиент обратился в частную клинику за рубежом, счет выше среднего.',
    verdict: 'review',
    tip: 'Основание для выплаты может быть, но нужны доп. документы и верификация расходов.',
    evidences: [
      { id: 'e1', text: 'Полис travel активен', usefulFor: ['approve'] },
      { id: 'e2', text: 'Клиника не в партнерской сети', usefulFor: ['review'] },
      { id: 'e3', text: 'Отчет врача без печати', usefulFor: ['review'] },
      { id: 'e4', text: 'Есть подтверждение экстренной помощи', usefulFor: ['approve'] },
      { id: 'e5', text: 'Сумма счета превышает лимит пакета', usefulFor: ['reject', 'review'] },
    ],
  },
];

export default function ClaimDetectiveGame() {
  const navigate = useNavigate();
  const { actions } = useApp();
  const [idx, setIdx] = useState(0);
  const [pickedEvidence, setPickedEvidence] = useState<Record<string, string[]>>({});
  const [pickedVerdict, setPickedVerdict] = useState<Record<string, Verdict>>({});
  const [submitted, setSubmitted] = useState(false);

  const current = FILES[idx];
  const selected = pickedEvidence[current.id] || [];

  const progress = useMemo(() => {
    let points = 0;
    for (const file of FILES) {
      const verdict = pickedVerdict[file.id];
      const selectedEvidence = pickedEvidence[file.id] || [];
      const evidencePoints = selectedEvidence.reduce((acc, id) => {
        const ev = file.evidences.find((e) => e.id === id);
        if (!ev) return acc;
        return acc + (ev.usefulFor.includes(file.verdict) ? 6 : -2);
      }, 0);
      const verdictPoints = verdict === file.verdict ? 24 : 0;
      points += Math.max(0, evidencePoints) + verdictPoints;
    }
    const max = FILES.length * (24 + 18);
    const percent = Math.round((points / max) * 100);
    return { points, percent };
  }, [pickedEvidence, pickedVerdict]);

  const toggleEvidence = (eId: string) => {
    setPickedEvidence((prev) => {
      const existing = prev[current.id] || [];
      const next = existing.includes(eId) ? existing.filter((id) => id !== eId) : [...existing, eId];
      return { ...prev, [current.id]: next };
    });
  };

  const canFinish = FILES.every((f) => (pickedVerdict[f.id] || null) !== null);

  const finish = async () => {
    if (submitted) return;
    setSubmitted(true);
    await actions.saveGameResult('claim-detective', progress.points, {
      solved: FILES.length,
      accuracy: progress.percent,
    });
  };

  const reset = () => {
    setSubmitted(false);
    setIdx(0);
    setPickedEvidence({});
    setPickedVerdict({});
  };

  if (submitted) {
    return (
      <div className={styles.page}>
        <div className={styles.resultSection}>
          <h2 className={styles.resultTitle}>Расследование завершено</h2>
          <p className={styles.resultScore}>{progress.points}</p>
          <p className={styles.resultPercent}>{progress.percent}% качества решений</p>
          <div className={styles.resultActions}>
            <button type="button" className={styles.primaryBtn} onClick={reset}>Новый разбор</button>
            <button type="button" className={styles.secondaryBtn} onClick={() => navigate('/games')}>К играм</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <InstructionBadge text="Отмечай релевантные улики и выбирай вердикт по каждому кейсу. Очки дают точные решения." />
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate('/games')}>←</button>
        <h1 className={styles.headerTitle}>Claim Detective</h1>
        <span className={styles.counter}>{idx + 1}/{FILES.length}</span>
      </div>

      <div className={styles.content}>
        <div className={styles.situationCard}>
          <p className={detectiveStyles.fileTitle}>{current.title}</p>
          <p className={styles.situationText}>{current.brief}</p>
        </div>

        <div className={detectiveStyles.boardTitle}>Доска улик (кликабельно)</div>
        <div className={detectiveStyles.evidenceGrid}>
          {current.evidences.map((e) => {
            const active = selected.includes(e.id);
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => toggleEvidence(e.id)}
                className={`${detectiveStyles.evCard} ${active ? detectiveStyles.evCardActive : ''}`}
              >
                {e.text}
              </button>
            );
          })}
        </div>

        <div className={styles.choicesLabel}>Вердикт по кейсу</div>
        <div className={styles.optionsList}>
          {VERDICTS.map((v) => {
            const chosen = pickedVerdict[current.id] === v.key;
            return (
              <button
                key={v.key}
                type="button"
                className={`${styles.optionBtn} ${chosen ? styles.correct : ''}`}
                onClick={() => setPickedVerdict((prev) => ({ ...prev, [current.id]: v.key }))}
              >
                {v.label}
              </button>
            );
          })}
        </div>

        <div className={detectiveStyles.navRow}>
          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={idx === 0}
            onClick={() => setIdx((v) => Math.max(0, v - 1))}
          >
            Предыдущий
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => {
              if (idx < FILES.length - 1) setIdx((v) => v + 1);
              else void finish();
            }}
            disabled={!pickedVerdict[current.id]}
          >
            {idx < FILES.length - 1 ? 'Следующий кейс' : 'Завершить расследование'}
          </button>
        </div>

        <div className={detectiveStyles.footerInfo}>
          <span>Рейтинг решения: {progress.points}</span>
          <span>{canFinish ? 'Можно завершать' : 'Нужно выбрать вердикты по всем кейсам'}</span>
        </div>
        <p className={detectiveStyles.tip}>Подсказка: {current.tip}</p>
      </div>
    </div>
  );
}
