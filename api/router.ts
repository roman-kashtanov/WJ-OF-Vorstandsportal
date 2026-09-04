import { sendEmail } from './email';
import { sendPush, getVapidPublicKey } from './push';
import { handleVoteLink } from './vote';
import { createVoteToken } from './voteToken';
import {
  handleVerifySubsidyCode,
  handleSubmitSubsidy,
  handleGetProofStatus,
  handleUploadProof,
  handleResendProofLink,
  handleGetSubsidyCatalogue,
} from './subsidy';

export interface ApiResponse {
  status: number;
  body: unknown;
  /** Gesetzt, wenn statt JSON eine fertige HTML-Seite ausgeliefert wird. */
  html?: string;
}

/**
 * Gemeinsames Routing fuer den lokalen Dev-Server (server.ts) und die
 * Netlify-Function (netlify/functions/api.mts). So gibt es die Logik nur einmal.
 */
export async function handleApiRequest(
  method: string,
  path: string,
  payload: any,
  query?: URLSearchParams,
  origin?: string
): Promise<ApiResponse> {
  const route = path.replace(/^\/?(\.netlify\/functions\/api)?\/?(api\/)?/, '').replace(/\/$/, '');

  if (method === 'GET' && route === 'health') {
    return { status: 200, body: { status: 'ok' } };
  }

  if (method === 'GET' && route === 'push/vapid-public-key') {
    const key = getVapidPublicKey();
    if (!key) {
      return { status: 500, body: { error: 'VAPID_PUBLIC_KEY ist nicht gesetzt.' } };
    }
    return { status: 200, body: { publicKey: key } };
  }

  if (method === 'POST' && route === 'push/send') {
    const result = await sendPush(payload?.subscriptions, payload?.payload);
    return { status: result.status, body: result.body };
  }

  // Stimmabgabe direkt aus der E-Mail, ohne Anmeldung
  if (method === 'GET' && route === 'vote') {
    const token = query?.get('t') || '';
    const result = await handleVoteLink(token, origin || '/');
    return { status: result.status, body: null, html: result.html };
  }

  // Signierte Links fuer eine Abstimmungs-E-Mail erzeugen
  if (method === 'POST' && route === 'vote/links') {
    const { resolutionId, memberId } = payload || {};
    if (!resolutionId || !memberId) {
      return { status: 400, body: { error: 'resolutionId und memberId werden benoetigt.' } };
    }

    const yes = createVoteToken(resolutionId, memberId, 'yes');
    if (!yes) {
      return {
        status: 500,
        body: { error: 'VOTE_LINK_SECRET ist auf dem Server nicht gesetzt.' },
      };
    }

    const base = `${origin || ''}/api/vote?t=`;
    return {
      status: 200,
      body: {
        yes: base + yes,
        no: base + createVoteToken(resolutionId, memberId, 'no'),
        abstain: base + createVoteToken(resolutionId, memberId, 'abstain'),
      },
    };
  }

  if (method === 'POST' && route === 'email/send') {
    const result = await sendEmail(payload || {});
    return { status: result.status, body: result.body };
  }

  // Oeffentliches Zuschuss-Antragsformular (/antrag) und Nachweis-Nachreichen (/nachweis)
  if (method === 'POST' && route === 'subsidy/verify-code') {
    const result = await handleVerifySubsidyCode(payload?.code || '');
    return { status: result.status, body: result.body };
  }

  if (method === 'POST' && route === 'subsidy/submit') {
    const result = await handleSubmitSubsidy(payload || {}, origin || '/');
    return { status: result.status, body: result.body };
  }

  if (method === 'GET' && route === 'subsidy/catalogue') {
    const result = await handleGetSubsidyCatalogue();
    return { status: result.status, body: result.body };
  }

  if (method === 'GET' && route === 'subsidy/proof') {
    const token = query?.get('t') || '';
    const result = await handleGetProofStatus(token);
    return { status: result.status, body: result.body };
  }

  if (method === 'POST' && route === 'subsidy/proof') {
    const { token, file, proofType } = payload || {};
    const result = await handleUploadProof(token || '', file, proofType);
    return { status: result.status, body: result.body };
  }

  if (method === 'POST' && route === 'subsidy/resend-proof-link') {
    const result = await handleResendProofLink(payload || {}, origin || '/');
    return { status: result.status, body: result.body };
  }

  return { status: 404, body: { error: `Unbekannter Endpunkt: ${method} /${route}` } };
}
