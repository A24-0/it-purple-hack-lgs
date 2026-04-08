import { useState, useMemo, useEffect } from 'react';
import { dictionaryApi } from '../../api/endpoints';
import type { DictionaryTerm } from '../../types';
import styles from './DictionaryPage.module.css';

export default function DictionaryPage() {
  const [terms, setTerms] = useState<DictionaryTerm[]>([]);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Все');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    dictionaryApi
      .getTerms()
      .then(setTerms)
      .catch(() => setLoadError('Не удалось загрузить словарь. Проверь API.'));
  }, []);

  const categories = useMemo(
    () => ['Все', ...new Set(terms.map((t) => t.category))],
    [terms]
  );

  const filtered = useMemo(() => {
    return terms.filter((t) => {
      const matchesSearch =
        t.term.toLowerCase().includes(search.toLowerCase()) ||
        t.definition.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'Все' || t.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory, terms]);

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.subtitle}>Изучай термины</p>
        <h1 className={styles.title}>Словарь</h1>
      </div>

      {loadError && <p className={styles.empty}>{loadError}</p>}

      <div className={styles.searchWrap}>
        <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="#9E9E9E" strokeWidth="2" />
          <path d="M16 16L20 20" stroke="#9E9E9E" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          className={styles.searchInput}
          placeholder="Поиск по терминам..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.chips}>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={`${styles.chip} ${activeCategory === c ? styles.chipActive : ''}`}
            onClick={() => setActiveCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className={styles.termsList}>
        {filtered.map((t) => {
          const open = expandedId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              className={`${styles.termCard} ${open ? styles.expanded : ''}`}
              onClick={() => setExpandedId(open ? null : t.id)}
            >
              <div className={styles.termHeader}>
                <span className={styles.termName}>{t.term}</span>
                <span className={styles.termCategory}>{t.category}</span>
              </div>
              {open && (
                <>
                  <p className={styles.termDefinition}>{t.definition}</p>
                  {t.examples && t.examples.length > 0 && (
                    <div className={styles.termDetail}>
                      <span className={styles.detailLabel}>Примеры</span>
                      <div className={styles.termExamples}>
                        <ul className={styles.exampleList}>
                          {t.examples.map((ex) => (
                            <li key={ex}>{ex}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  {t.relatedTerms && t.relatedTerms.length > 0 && (
                    <div className={styles.relatedTerms}>
                      <span className={styles.detailLabel}>Связанные термины</span>
                      <div className={styles.relatedChips}>
                        {t.relatedTerms.map((r) => (
                          <span key={r} className={styles.relatedChip}>
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {!loadError && terms.length === 0 && <p className={styles.empty}>Загрузка…</p>}
    </div>
  );
}
