import styles from "./Title.module.css";

const Title = () => {
  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>EDA.ai</h1>
      <p className={styles.subtitle}>
        Branch, Compare, Merge — まずはメッセージを入力。
      </p>
    </div>
  );
};

export default Title;
