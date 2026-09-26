import { apiRootUrl } from '../../../core/api/client';
import type { AiStatus } from '../types/aiStatus';

type HealthResponse = {
  success?: boolean;
  data?: {
    analysis_mode?: string;
    local_ai_model?: string | null;
  };
};

export async function fetchAiStatus(): Promise<AiStatus> {
  const response = await fetch(apiRootUrl('/health'));
  if (!response.ok) throw new Error('AI status unavailable');
  const body = await response.json() as HealthResponse;
  return {
    enabled: body.data?.analysis_mode === 'local-model-assisted',
    model: body.data?.local_ai_model ?? null,
    status: body.data?.analysis_mode === 'local-model-assisted' ? 'configured' : 'not_configured',
  };
}
