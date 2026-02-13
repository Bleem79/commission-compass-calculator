// Map request types to background and text colors for consistent styling
export const getRequestTypeColors = (requestType: string): { bg: string; text: string } => {
  switch (requestType) {
    case "single_to_double":
      return { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300" };
    case "double_to_single":
      return { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" };
    case "cng_to_hybrid":
      return { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300" };
    case "day_off":
      return { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300" };
    default:
      return { bg: "bg-gray-100 dark:bg-gray-900/30", text: "text-gray-700 dark:text-gray-300" };
  }
};
