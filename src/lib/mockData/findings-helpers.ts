/** Mock source code lines for findings detail view. */
export const MOCK_SOURCE_LINES = [
  { num: 43, code: 'char buffer[256];', highlight: false },
  { num: 44, code: 'printf("Enter input: ");', highlight: false },
  { num: 45, code: 'gets(buffer);', highlight: true, annotation: '← vulnerability' },
  { num: 46, code: '', highlight: false },
  { num: 47, code: 'if (strcmp(buffer, password) == 0) {', highlight: false },
  { num: 48, code: '  grant_access();', highlight: false },
  { num: 49, code: '}', highlight: false },
];

/** Mock AI suggestion code for findings detail view. */
export const MOCK_AI_SUGGESTION_CODE = 'fgets(buffer, sizeof(buffer), stdin);';
