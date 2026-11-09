"use client";

import type { Message } from "@/types";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import {
  Box,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { memo } from "react";
import type React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type ChatActor = "user" | "bot";

/* Bubble */
interface BubbleProps {
  mine?: boolean;
  text: string;
  time?: string;
  groupedTop?: boolean;
  groupedBottom?: boolean;
}
const Bubble = memo(function Bubble({
  mine,
  text,
  time,

  groupedBottom,
}: BubbleProps) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: mine ? "flex-end" : "flex-start",
        mb: groupedBottom ? 0.5 : 1.25,
      }}
    >
      <Paper
        elevation={mine ? 1 : 0}
        sx={(t) => ({
          maxWidth: "100%",
          px: 1.5,
          py: 1,

          bgcolor: mine ? t.palette.primary.main : t.palette.background.paper,
          color: mine ? t.palette.primary.contrastText : t.palette.text.primary,

          transition: "transform .12s ease, opacity .12s ease",
        })}
      >
        <div className="prose dark:prose-invert">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ node, ...props }) => (
                <Typography variant="h1" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <Typography variant="h2" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <Typography variant="h3" {...props} />
              ),
              h4: ({ node, ...props }) => (
                <Typography variant="h4" {...props} />
              ),
              h5: ({ node, ...props }) => (
                <Typography variant="h5" {...props} />
              ),
              h6: ({ node, ...props }) => (
                <Typography variant="h6" {...props} />
              ),
              a: ({ node, ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" />
              ),
            }}
          >
            {text}
          </ReactMarkdown>
        </div>
        {!!time && (
          <Typography
            variant="caption"
            sx={{
              opacity: 0.6,
              display: "block",
              textAlign: "right",
              mt: 0.25,
            }}
          >
            {time}
          </Typography>
        )}
      </Paper>
    </Box>
  );
});

export const DateSeparator = memo(function DateSeparator({
  label,
}: { label: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={2} sx={{ my: 2.5 }}>
      <Box sx={{ flex: 1, height: 1, bgcolor: "divider" }} />
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Box sx={{ flex: 1, height: 1, bgcolor: "divider" }} />
    </Stack>
  );
});

export interface ChatMessageListProps {
  messages: Message[];
  dateLabel?: string;
  onCreateBranch?: (messageId: string) => void;
  chatListRef?: React.RefObject<HTMLDivElement | null>;
}
export const ChatMessageList = ({
  messages,
  dateLabel = "Today",
  onCreateBranch,
  chatListRef,
}: ChatMessageListProps) => {
  return (
    <Box sx={{ width: "100%", overflowY: "auto", py: 3, px: { xs: 2, md: 3 } }}>
      <DateSeparator label={dateLabel} />
      {messages.map((msg) => (
        <Box key={msg.id}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <Box>
              {msg.promptText && (
                <Bubble mine text={msg.promptText} groupedBottom />
              )}
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Box sx={{ width: "75%" }}>
                {msg.response && <Bubble text={msg.response} groupedTop />}
              </Box>
              <Box
                sx={{
                  width: "75%",
                  display: "flex",
                  justifyContent: "flex-start",
                  mt: 0.25,
                  pl: 1,
                }}
              >
                <Tooltip title="この対話からブランチを作成" arrow>
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => onCreateBranch?.(msg.id)}
                    >
                      <CallSplitIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          </Box>
        </Box>
      ))}
      <Box ref={chatListRef} sx={{ height: "1px" }} />
    </Box>
  );
};

export default ChatMessageList;
