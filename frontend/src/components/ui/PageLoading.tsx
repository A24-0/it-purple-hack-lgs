import { APP_NAME } from '../../config/app';
import styles from './PageLoading.module.css';

type Props = {
  /** Подпись под спиннером */
  message?: string;
};

export default function PageLoading({ message = 'Загружаем экран…' }: Props) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.brand}>
        <div className={styles.spinner} aria-hidden />
        <span className={styles.brandName}>{APP_NAME}</span>
      </div>
      <p className={styles.hint}>{message}</p>
    </div>
  );
}
