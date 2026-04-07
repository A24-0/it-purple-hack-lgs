import { useState, useMemo } from 'react';
import { dictionaryTerms } from '../../data/mockData';
import styles from './DictionaryPage.module.css';

const categories = ['Все', ...new Set(dictionaryTerms.map((t) => t.category))];

export default function DictionaryPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Все');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return dictionaryTerms.filter((t) => {
      const matchesSearch =
        t.term.toLowerCase().includes(search.toLowerCase()) ||
        t.definition.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        activeCategory === 'Все' || t.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory]);

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.subtitle}>Изучай термины</p>
        <h1 className={styles.title}>Словарь</h1>
      </div>

      <div className={styles.searchWrap}>
        <svg
          className={styles.searchIcon}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle cx="11" cy="11" r="7" stroke="#9E9E9E" strokeWidth="2" />
          <path
            d="M16 16L20 20"
            stroke="#9E9E9E"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <input
          className={styles.searchInput}
          placeholder="Поиск терминов..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.chips}>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`${styles.chip} ${
              activeCategory === cat ? styles.chipActive : ''
            }`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className={styles.termsList}>
        {filtered.map((t) => (
          <button
            key={t.id}
            className={`${styles.termCard} ${
              expandedId === t.id ? styles.expanded : ''
            }`}
            onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
          >
            <div className={styles.termHeader}>
              <span className={styles.termName}>{t.term}</span>
              <span className={styles.termCategory}>{t.category}</span>
            </div>
            {expandedId === t.id && (
              <div className={styles.termDetail}>
                <p className={styles.termDefinition}>{t.definition}</p>
                {t.examples && t.examples.length > 0 && (
                  <div className={styles.termExamples}>
                    <span className={styles.detailLabel}>Примеры:</span>
                    <ul className={styles.exampleList}>
                      {t.examples.map((ex, i) => (
                        <li key={i}>{ex}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {t.relatedTerms && t.relatedTerms.length > 0 && (
                  <div className={styles.relatedTerms}>
                    <span className={styles.detailLabel}>Связанные:</span>
                    <div className={styles.relatedChips}>
                      {t.relatedTerms.map((rt) => (
                        <span key={rt} className={styles.relatedChip}>{rt}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className={styles.empty}>Ничего не найдено</p>
        )}
      </div>
    </div>
  );
}
