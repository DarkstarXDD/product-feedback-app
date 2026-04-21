/** This mapper is the single path for all suggestion responses.
 * This either derives viewerHasUpvoted from the upvotes array (when authenticated)
 * or defaults to false (when unauthenticated or on create).
 * Every suggestion response shape includes it.
 */
export function withUpvoteStatus<T extends object>(
  suggestion: { upvotes?: Array<{ id: string }> } & T
): { viewerHasUpvoted: boolean } & Omit<T, "upvotes"> {
  const viewerHasUpvoted =
    Array.isArray(suggestion.upvotes) && suggestion.upvotes.length > 0
  const { upvotes: _upvotes, ...suggestionData } = suggestion

  return {
    ...suggestionData,
    viewerHasUpvoted,
  }
}
