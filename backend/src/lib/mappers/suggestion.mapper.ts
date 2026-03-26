/** Adds `viewerHasUpvoted` and removes the temporary `upvotes` field. */
export function mapSuggestionWithUpvoteStatus<T extends object>(
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
