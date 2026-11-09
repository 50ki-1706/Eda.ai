import styles from "./Title.module.css";

/** ホーム画面のタイトルとリード文 */
const Title = () => {
  return (
    <div className={styles.wrapper}>
      <p className={styles.eyebrow}>Branched AI Chat</p>
      <h1 className={styles.title}>
        Eda<span className={styles.accent}>.ai</span>
      </h1>
      <p className={styles.subtitle}>
        分岐・比較・マージ。会話の流れを、好きなだけ枝分かれさせよう。
      </p>
    </div>
  );
};

export default Title;
