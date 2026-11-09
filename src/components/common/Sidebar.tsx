"use client";
import { useSidebar } from "@/hooks/common/useSidebar";
import { ChevronLeft, Menu, Plus } from "lucide-react";
import styles from "./Sidebar.module.css";

const Sidebar = () => {
  const { openDrawer, chats, toggleDrawer, handleChatClick, handleAddChat } =
    useSidebar();

  return (
    <>
      <button
        type="button"
        className={styles.toggle}
        data-open={openDrawer || undefined}
        onClick={toggleDrawer}
        aria-label="メニューを開く"
        aria-expanded={openDrawer}
      >
        {openDrawer ? (
          <ChevronLeft aria-hidden="true" />
        ) : (
          <Menu aria-hidden="true" />
        )}
      </button>

      {openDrawer && (
        <>
          <button
            type="button"
            className={styles.backdrop}
            aria-label="メニューを閉じる"
            onClick={toggleDrawer}
          />
          <aside className={styles.drawer} aria-label="チャット一覧">
            <div className={styles.subheader}>
              <span>チャット</span>
              <button
                type="button"
                className={styles.addButton}
                aria-label="新規チャットを追加"
                onClick={handleAddChat}
              >
                <Plus size={20} aria-hidden="true" />
              </button>
            </div>
            <ul className={styles.list}>
              {[...chats].reverse().map((chat) => (
                <li key={chat.id}>
                  <button
                    type="button"
                    className={styles.listItem}
                    onClick={() => handleChatClick(chat.id)}
                  >
                    {chat.summary}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </>
      )}
    </>
  );
};

export default Sidebar;
