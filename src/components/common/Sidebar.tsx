"use client";
import { useSidebar } from "@/hooks/common/useSidebar";
import AddIcon from "@mui/icons-material/Add";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DehazeIcon from "@mui/icons-material/Dehaze";
import {
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListSubheader,
} from "@mui/material";

const drawerWidth = 240;

const Sidebar = () => {
  const {
    openDrawer,
    projects,
    chats,
    toggleDrawer,
    handleChatClick,
    handleAddChat,
  } = useSidebar();

  return (
    <>
      <IconButton
        onClick={toggleDrawer}
        sx={{
          position: "fixed",
          top: 8,
          left: openDrawer ? drawerWidth : 0,
          zIndex: 1201,
          backgroundColor: "#000",
          color: "#fff",
          borderRadius: "0 10px 10px 0",
          width: 40,
          height: 60,
          "&:hover": {
            backgroundColor: "#222",
          },
          transition: "left 0.23s ease",
        }}
        aria-label="メニューを開く"
      >
        {openDrawer ? <ChevronLeftIcon /> : <DehazeIcon />}
      </IconButton>

      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            background:
              "radial-gradient(circle at center, #ffffff 0%, #f5f5f5 60%, #eaeaea 100%)",
            color: "#000",
            borderRight: "1px solid #dcdcdc",
          },
        }}
        anchor="left"
        open={openDrawer}
        onClose={toggleDrawer}
      >
        <List
          subheader={
            <ListSubheader component="div" id="project-list-subheader">
              プロジェクト
            </ListSubheader>
          }
        >
          {projects.map((project) => (
            <ListItem key={project.id} disablePadding>
              <ListItemButton>
                <ListItemText primary={project.name} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider />
        <List
          subheader={
            <ListSubheader
              component="div"
              id="chat-list-subheader"
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "transparent",
              }}
            >
              チャット
              <AddIcon sx={{ fontSize: 20 }} onClick={handleAddChat} />
            </ListSubheader>
          }
        >
          {chats.map((chat) => (
            <ListItem
              key={chat.id}
              disablePadding
              onClick={() => handleChatClick(chat.id)}
            >
              <ListItemButton>
                <ListItemText primary={chat.summary} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
    </>
  );
};

export default Sidebar;
