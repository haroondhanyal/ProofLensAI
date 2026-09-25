export type AiStatus = {
  enabled: boolean;
  model: string | null;
  status: 'configured' | 'not_configured' | 'unavailable';
};
