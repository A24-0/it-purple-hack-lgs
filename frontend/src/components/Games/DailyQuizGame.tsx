import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DailyQuiz, DailyQuizAnswerResponse } from '../../api/endpoints';
import { quizzesApi } from '../../api/endpoints';
import styles from './GuessRiskGame.module.css';
import InstructionBadge from './InstructionBadge';

export default function DailyQuizGame() {
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<DailyQuiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ question_id: number; selected_index: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DailyQuizAnswerResponse | null>(null);

  const currentQuestion = useMemo(() => quiz?.questions[step] ?? null, [quiz, step]);

  const loadQuiz = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await quizzesApi.getDaily();
      setQuiz(data);
      setStep(0);
      setSelectedIndex(null);
      setAnswers([]);
      setResult(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQuiz();
  }, []);

  const handleSelect = (idx: number) => {
    if (selectedIndex !== null || !currentQuestion) return;
    setSelectedIndex(idx);
  };

  const handleNext = async () => {
    if (!currentQuestion || selectedIndex === null || !quiz) return;

    const nextAnswers = [...answers, { question_id: currentQuestion.id, selected_index: selectedIndex }];
    const isLast = step + 1 >= quiz.questions.length;

    if (isLast) {
      setSubmitting(true);
      setError(null);
      try {
        const res = await quizzesApi.answerDaily(quiz.id, nextAnswers);
        setAnswers(nextAnswers);
        setResult(res);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setAnswers(nextAnswers);
    setStep((p) => p + 1);
    setSelectedIndex(null);
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.resultSection}>
          <h2 className={styles.resultTitle}>Загружаем блиц-квиз...</h2>
        </div>
      </div>
    );
  }

  if (!quiz || !currentQuestion) {
    return (
      <div className={styles.page}>
        <div className={styles.resultSection}>
          <h2 className={styles.resultTitle}>Квиза на сегодня пока нет</h2>
          {error && <p className={styles.resultPercent}>{error}</p>}
          <div className={styles.resultActions}>
            <button type="button" className={styles.primaryBtn} onClick={() => void loadQuiz()}>
              Обновить
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={() => navigate('/games')}>
              К играм
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (result && quiz) {
    const percent = Math.round((result.correct_count / Math.max(result.total_questions, 1)) * 100);
    return (
      <div className={styles.page}>
        <div className={styles.resultSection}>
          <div className={styles.resultIcon}>{percent >= 70 ? 'A' : percent >= 40 ? 'B' : 'C'}</div>
          <h2 className={styles.resultTitle}>Квиз завершен</h2>
          <p className={styles.resultScore}>
            {result.correct_count}/{result.total_questions}
          </p>
          <p className={styles.resultPercent}>{percent}% верных ответов</p>
          <div className={styles.resultRewards}>
            <span className={styles.rewardBadge}>+{result.xp_earned} оч.</span>
          </div>

          <div className={styles.reviewSection}>
            <h3 className={styles.reviewHeading}>Разбор ответов</h3>
            {quiz.questions.map((q) => {
              const r = result.results.find((x) => x.question_id === q.id);
              const a = answers.find((x) => x.question_id === q.id);
              if (!r) return null;
              const ok = r.correct;
              const userIdx = a?.selected_index;
              const userLabel =
                userIdx !== undefined && q.options[userIdx] !== undefined ? q.options[userIdx] : '—';
              const correctLabel =
                q.options[r.correct_index] !== undefined ? q.options[r.correct_index] : '—';
              return (
                <div
                  key={q.id}
                  className={`${styles.reviewRow} ${ok ? styles.reviewRowOk : styles.reviewRowBad}`}
                >
                  <div className={styles.reviewBadge}>{ok ? 'Верно' : 'Ошибка'}</div>
                  <p className={styles.reviewQ}>{q.text}</p>
                  <div className={styles.reviewMeta}>
                    Твой ответ: <strong>{userLabel}</strong>
                    {!ok && (
                      <>
                        <br />
                        Верный вариант: <strong>{correctLabel}</strong>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {error && <p className={styles.resultPercent}>{error}</p>}
          <div className={styles.resultActions}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => {
                setStep(0);
                setSelectedIndex(null);
                setAnswers([]);
                setResult(null);
              }}
            >
              Играть снова
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={() => navigate('/games')}>
              К играм
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isAnswered = selectedIndex !== null;

  return (
    <div className={styles.page}>
      <InstructionBadge text="Блиц-квиз дня: отвечай быстро и получай очки опыта за верные ответы." />

      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => navigate('/games')} aria-label="Назад">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className={styles.headerTitle}>{quiz.title}</h1>
        <span className={styles.counter}>
          {step + 1}/{quiz.questions.length}
        </span>
      </div>

      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${((step + 1) / quiz.questions.length) * 100}%` }} />
      </div>

      <div className={styles.content}>
        <div className={styles.situationCard}>
          <p className={styles.situationText}>{currentQuestion.text}</p>
        </div>

        <p className={styles.choicesLabel}>Быстрый ответ</p>

        <div className={styles.optionsList}>
          {currentQuestion.options.map((opt, idx) => {
            let cls = styles.optionBtn;
            if (isAnswered) {
              if (idx === selectedIndex) cls += ` ${styles.optionSelected}`;
              else cls += ` ${styles.dimmed}`;
            }
            return (
              <button key={`${currentQuestion.id}-${idx}`} type="button" className={cls} onClick={() => handleSelect(idx)} disabled={isAnswered}>
                <span className={styles.optionText}>{opt}</span>
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div className={`${styles.explanationCard} ${styles.explanationCardPending}`}>
            <div className={styles.feedbackRibbon}>
              {step + 1 >= quiz.questions.length ? 'Готово к проверке' : 'Ответ выбран'}
            </div>
            <div className={styles.explanationCardBody}>
              <p className={styles.explanationText}>
                {step + 1 >= quiz.questions.length
                  ? 'Нажми кнопку ниже — мы проверим ответы и покажем результат с разбором.'
                  : 'Переходи к следующему вопросу, когда будешь готов.'}
              </p>
              {error && <p className={styles.explanationText}>{error}</p>}
              <button type="button" className={styles.nextBtn} onClick={() => void handleNext()} disabled={submitting}>
                {submitting ? 'Отправляем...' : step + 1 >= quiz.questions.length ? 'Проверить ответы' : 'Следующий вопрос →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
