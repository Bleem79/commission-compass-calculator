export const unreadAdminNotificationIds = (
  messages: { id: string }[],
  readIds: string[],
): string[] => {
  const read = new Set(readIds);
  return [...new Set(messages.map((message) => message.id))].filter((id) => !read.has(id));
};