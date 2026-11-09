import styles from "./LoadingIndicator.module.css";

export default function LoadingIndicator({ text }: { text: string }) {
  return (
    <div className={styles.wrapper}>
      <span className="eda-spinner" aria-hidden="true" />
      <p className={styles.text}>{text}</p>
    </div>
  );
}
