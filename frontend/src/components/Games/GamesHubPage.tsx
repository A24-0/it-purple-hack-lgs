import { useNavigate } from 'react-router-dom';
import styles from './GamesHubPage.module.css';

type Tone = 'teal' | 'orange' | 'slate' | 'violet';

type GameCard = {
  to: string;
  title: string;
  desc: string;
  tag: string;
  tone: Tone;
  soon?: boolean;
};

const games: GameCard[] = [
  {
    to: '/game/daily-quiz',
    title: 'Блиц-вопросы',
    desc: 'Пять коротких вопросов подряд — закрепляй тему и копи очки.',
    tag: '2–3 мин',
    tone: 'orange',
  },
  {
    to: '/game/term-snap',
    title: 'Факт или миф',
    desc: 'Быстрые решения по таймеру: успей, пока горит шкала.',
    tag: 'реакция',
    tone: 'teal',
  },
  {
    to: '/game/lane-rush',
    title: 'Логика выплат',
    desc: 'Разбор кейсов: одобрить, отказать или отправить на проверку.',
    tag: 'логика',
    tone: 'slate',
  },
  {
    to: '/game/guess-risk',
    title: 'Главный риск',
    desc: 'Карточки ситуаций — выбери, что важнее застраховать.',
    tag: 'логика',
    tone: 'violet',
  },
  {
    to: '/game/build-policy',
    title: 'Собери защиту',
    desc: 'Распредели бюджет между видами покрытия.',
    tag: 'стратегия',
    tone: 'violet',
  },
  {
    to: '/game/claim-simulator',
    title: 'Путь убытка',
    desc: 'Пошагово: что делать после страхового случая.',
    tag: 'квест',
    tone: 'teal',
  },
  {
    to: '/game/catch-policies',
    title: 'Конструктор защиты',
    desc: 'Собери страховой набор под бюджет и закрой ключевые риски.',
    tag: 'стратегия',
    tone: 'orange',
  },
  {
    to: '/game/claim-detective',
    title: 'Детектив убытков',
    desc: 'Кликабельная доска улик и вердикты по сложным страховым кейсам.',
    tag: 'логика',
    tone: 'violet',
  },
  {
    to: '/game/memory-terms',
    title: 'Память терминов',
    desc: 'Улучшенный режим на 12 карточек с едиными размерами и читаемым текстом.',
    tag: 'память',
    tone: 'slate',
  },
  {
    to: '/game/insurance-sorter',
    title: 'Сортировка полисов',
    desc: 'Разложи кейсы по категориям: обязательно или по желанию.',
    tag: 'классификация',
    tone: 'orange',
  },
  {
    to: '/game/quiz-battle',
    title: 'Баттл с ботом',
    desc: 'Серия раундов: ты против бота, кто точнее и быстрее.',
    tag: 'дуэль',
    tone: 'slate',
  },
  {
    to: '/help',
    title: 'Справка',
    desc: 'Вопросы по терминам и сценариям — ответы от сервиса подсказок.',
    tag: 'помощь',
    tone: 'teal',
  },
];

export default function GamesHubPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.kicker}>Играй и разбирайся</p>
        <h1 className={styles.title}>Мини-игры</h1>
        <p className={styles.subtitle}>
          Головоломки, кейсы, стратегии и квесты — учись играючи.
        </p>
      </header>

      <section className={styles.section} aria-labelledby="daily-heading">
        <h2 id="daily-heading" className={styles.sectionTitle}>
          На сегодня
        </h2>
        <button type="button" className={styles.dailyCta} onClick={() => navigate('/game/daily-quiz')}>
          <span className={styles.dailyMark} aria-hidden />
          <span>
            <strong>Блиц-вопросы</strong>
            <span className={styles.dailySub}>Короткий заход без лишней теории</span>
          </span>
          <span className={styles.dailyArrow} aria-hidden>
            →
          </span>
        </button>
      </section>

      <section className={styles.section} aria-labelledby="genres-heading">
        <h2 id="genres-heading" className={styles.sectionTitle}>
          Каталог
        </h2>
        <div className={styles.grid}>
          {games.map((g) => (
            <button
              key={g.title}
              type="button"
              className={`${styles.card} ${styles[`tone${g.tone.charAt(0).toUpperCase()}${g.tone.slice(1)}`]}`}
              onClick={() => {
                if (g.soon) return;
                navigate(g.to);
              }}
              disabled={g.soon}
            >
              <span className={styles.cardTag}>{g.tag}</span>
              <span className={styles.cardTitle}>{g.title}</span>
              <span className={styles.cardDesc}>{g.desc}</span>
              {g.soon && <span className={styles.soonBadge}>Скоро</span>}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
