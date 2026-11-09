"use client";
import PageContainer from "@/components/common/PageContainer";
import Sidebar from "@/components/common/Sidebar";
import StoryTree from "@/components/domain/(authenticated)/tree/StoryTree";
import useTree from "@/hooks/domain/chat/tree/useTree";
import styles from "./page.module.css";

export default function Page() {
  const {
    handleBranchMerge,
    handleBranchNavigation,
    handleClick,
    isChecked,
    setIsChecked,
    branchStructure,
  } = useTree();

  if (!branchStructure) return null;

  return (
    <PageContainer
      centerLayout={false}
      bgColor={isChecked ? "#A0A0A0" : "#fff"}
    >
      <div className={styles.layout}>
        <Sidebar />

        <div id="treeWrapper" className={styles.treeWrapper}>
          <StoryTree
            data={branchStructure}
            onNodeClick={(branchId) =>
              handleClick(branchId, handleBranchMerge, handleBranchNavigation)
            }
          />
        </div>
        <div className={styles.mergeMode}>
          <span className={styles.mergeModeLabel}>merge mode</span>
          <label className={styles.switch}>
            <input
              type="checkbox"
              className={styles.switchInput}
              checked={isChecked}
              onChange={() => setIsChecked(!isChecked)}
              aria-label="merge mode を有効にする"
            />
            <span className={styles.switchTrack} aria-hidden="true">
              <span className={styles.switchThumb} />
            </span>
          </label>
        </div>
      </div>
    </PageContainer>
  );
}
