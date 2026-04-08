import styles from './InstructionBadge.module.css';

export default function InstructionBadge({ text }: { text: string }) {
  return (
    <aside className={styles.badge} aria-label="Правила игры">
      <span className={styles.title}>Инструкция</span>
      {text}
    </aside>
  );
}
