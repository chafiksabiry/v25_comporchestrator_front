import { getDashCallsApiBase } from './callsApiBase';

export type VoiceAssistantConfig = {
  enabled: boolean;
  name?: string;
  voice?: string;
};

export type AiOutboundSession = {
  callId?: string;
  callControlId: string;
};

function jsonOrEmpty(res: Response): Promise<Record<string, unknown>> {
  return res.json().catch(() => ({}));
}

export async function fetchVoiceAssistant(gigId: string): Promise<VoiceAssistantConfig | null> {
  if (!gigId) return null;
  const res = await fetch(`${getDashCallsApiBase()}/gigs/${gigId}/voice-assistant`);
  const data = await jsonOrEmpty(res);
  const raw =
    (data.data as { voiceAssistant?: VoiceAssistantConfig } | undefined)?.voiceAssistant ??
    (data.voiceAssistant as VoiceAssistantConfig | undefined);
  if (!raw || typeof raw !== 'object') return { enabled: false };
  return { enabled: Boolean(raw.enabled), name: raw.name, voice: raw.voice };
}

export async function saveVoiceAssistant(params: {
  gigId: string;
  enabled: boolean;
  gigTitle?: string;
}): Promise<void> {
  const res = await fetch(`${getDashCallsApiBase()}/gigs/${params.gigId}/voice-assistant`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      enabled: params.enabled,
      name: 'HARX AI Voice',
      voice: 'alloy',
      gigTitle: params.gigTitle,
      greeting: '',
      systemPrompt:
        'Respecte strictement le script actif du gig (phases / playbook). Ne invente pas un pitch générique.',
    }),
  });
  const data = await jsonOrEmpty(res);
  if (!res.ok) {
    throw new Error(String(data.error || data.message || `HTTP ${res.status}`));
  }
}

export async function startAiOutboundCall(body: {
  leadId: string;
  gigId?: string;
  companyId?: string;
}): Promise<AiOutboundSession> {
  const res = await fetch(`${getDashCallsApiBase()}/calls/ai-outbound`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await jsonOrEmpty(res);
  if (!res.ok) {
    throw new Error(String(data.message || data.error || `HTTP ${res.status}`));
  }
  const callControlId = data.callControlId ? String(data.callControlId) : '';
  if (!callControlId) {
    throw new Error(String(data.message || 'callControlId missing'));
  }
  return {
    callControlId,
    callId: data.callId ? String(data.callId) : undefined,
  };
}

export async function hangupAiOutboundCall(session: AiOutboundSession): Promise<void> {
  const res = await fetch(`${getDashCallsApiBase()}/calls/ai-outbound/hangup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callControlId: session.callControlId,
      callId: session.callId,
    }),
  });
  const data = await jsonOrEmpty(res);
  if (!res.ok) {
    throw new Error(String(data.message || data.error || `HTTP ${res.status}`));
  }
}
