// In its own file to avoid circular dependencies
export const FILE_EDIT_TOOL_NAME = 'Edit'

// Permission pattern for granting session-level access to the project's .neo/ folder
export const NEO_FOLDER_PERMISSION_PATTERN = '/.neo/**'

// Permission pattern for granting session-level access to the global ~/.neo/ folder
export const GLOBAL_NEO_FOLDER_PERMISSION_PATTERN = '~/.neo/**'

/** @deprecated Use NEO_FOLDER_PERMISSION_PATTERN */
export const CLAUDE_FOLDER_PERMISSION_PATTERN = NEO_FOLDER_PERMISSION_PATTERN
/** @deprecated Use GLOBAL_NEO_FOLDER_PERMISSION_PATTERN */
export const GLOBAL_CLAUDE_FOLDER_PERMISSION_PATTERN = GLOBAL_NEO_FOLDER_PERMISSION_PATTERN

export const FILE_UNEXPECTEDLY_MODIFIED_ERROR =
  'File has been unexpectedly modified. Read it again before attempting to write it.'
