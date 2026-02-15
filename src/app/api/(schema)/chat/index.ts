import z from "zod";

export const createChatInputSchema = z.object({
  promptText: z.string(),
  promptFile: z
    .object({
      data: z.string(),
      mimeType: z.string(),
    })
    .optional(),
  provider: z.enum(["gemini", "openrouter"]),
});

export const sendMessageInputSchema = z.object({
  promptText: z.string(),
  promptFile: z
    .object({
      data: z.string(),
      mimeType: z.string(),
    })
    .optional(),
  branchId: z.string().uuid(),
  latestMessageId: z.string().uuid(),
  provider: z.enum(["gemini", "openrouter"]),
});

export const getMessageInputSchema = z.object({
  branchId: z.string().uuid(),
});

export const newBranchInputSchema = z.object({
  summary: z.string(),
  parentBranchId: z.string().uuid(),
  chatId: z.string().uuid(),
  messageId: z.string().uuid(),
  promptText: z.string(),
  response: z.string(),
});

export const mergeBranchInputSchema = z.object({
  branchId: z.string().uuid(),
});

export const updateChatIsPinnedInputSchema = z.object({
  chatId: z.string().uuid(),
  isPinned: z.boolean(),
});

export const branchStructureInputSchema = z.object({
  chatId: z.string().uuid(),
});

export type CreateChatInput = z.infer<typeof createChatInputSchema>;
export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;
export type GetMessageInput = z.infer<typeof getMessageInputSchema>;
export type NewBranchInput = z.infer<typeof newBranchInputSchema>;
export type MergeBranchInput = z.infer<typeof mergeBranchInputSchema>;
export type UpdateChatIsPinnedInput = z.infer<
  typeof updateChatIsPinnedInputSchema
>;
export type BranchStructureInput = z.infer<typeof branchStructureInputSchema>;
