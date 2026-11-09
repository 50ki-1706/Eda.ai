"use client";
import PageContainer from "@/components/common/PageContainer";
import Sidebar from "@/components/common/Sidebar";
import StoryTree from "@/components/domain/(authenticated)/tree/StoryTree";
import useTree from "@/hooks/domain/chat/tree/useTree";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import FormLabel from "@mui/material/FormLabel";
import Switch from "@mui/material/Switch";

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
      <div className="w-full h-screen flex">
        <style jsx global>{`
          /* ストーリーツリーの「道」の描き分け */
          .story-path {
            stroke: #000;
            stroke-width: 2;
            fill: none;
            stroke-linecap: round;
            opacity: 0.9;
          }
          .story-path:hover {
            stroke: #444;
            stroke-width: 3;
          }
        `}</style>
        <Sidebar />

        <div
          id="treeWrapper"
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          <StoryTree
            data={branchStructure}
            onNodeClick={(branchId) =>
              handleClick(branchId, handleBranchMerge, handleBranchNavigation)
            }
          />
        </div>
        <FormGroup className="w-30 flex  items-center pt-2 pr-2">
          <FormLabel component="legend">merge mode</FormLabel>
          <FormControlLabel
            control={
              <Switch
                checked={isChecked}
                onChange={() => setIsChecked(!isChecked)}
              />
            }
            label=""
            sx={{ ml: 1 }}
          />
        </FormGroup>
      </div>
    </PageContainer>
  );
}
