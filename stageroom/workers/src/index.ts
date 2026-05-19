import { Env } from './db/schema';
import { runMigrations } from './db/migrations';
import { createEvent, getEvent, listEvents, updateEvent, deleteEvent, getDonationConfig, createDonationConfig, updateDonationConfig } from './db/events';
import { createTicket, getTicket, listEventTickets, confirmTicket, countEventTickets } from './db/tickets';
import { createDonation, getDonation, listEventDonations, sumEventDonations, getDonationStats } from './db/donations';
import { registerGuest, getGuest, getGuestByAccessCode, getGuestByEmail, listEventGuests, markGuestJoined, countEventGuests } from './db/guests';
import { createPayment, getPayment, getPaymentByProviderId, updatePaymentStatus, listEventPayments, sumEventRevenue } from './db/payments';
import { verifyClerkToken, syncUserToDB, getUserByClerkId, getClerkAuthHeader } from './auth/clerk';
import { generateLiveKitToken } from './livekit/token';
import { initializePaystackPayment, verifyPaystackPayment } from './payments/paystack';
import { createLiveInput, listLiveInputs, getLiveInput, deleteLiveInput } from './stream/index';
import { YouTubeService } from './platforms/youtube/index';
import { TwitchService } from './platforms/twitch/index';
import { FacebookService } from './platforms/facebook/index';
import { RtmpService } from './platforms/rtmp/index';
import { startRecording, getLiveInputRecordings, archiveRecordingToR2, deleteRecordingFromStream } from './recording/index';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    await runMigrations(env.DB);

    try {
      if (path === '/api/migrations/run' && request.method === 'POST') {
        const success = await runMigrations(env.DB);
        return jsonResponse({ success }, 200, corsHeaders);
      }

      if (path.startsWith('/api/auth/clerk-webhook')) {
        return handleClerkAuth(request, env, corsHeaders);
      }

      if (path.startsWith('/api/events')) {
        return handleEvents(request, env, corsHeaders);
      }

      if (path.startsWith('/api/tickets')) {
        return handleTickets(request, env, corsHeaders);
      }

      if (path.startsWith('/api/donations')) {
        return handleDonations(request, env, corsHeaders);
      }

      if (path.startsWith('/api/guests')) {
        return handleGuests(request, env, corsHeaders);
      }

      if (path.startsWith('/api/payments')) {
        return handlePayments(request, env, corsHeaders);
      }

      if (path.startsWith('/api/livekit/token')) {
        return handleLiveKitToken(request, env, corsHeaders);
      }

      if (path.startsWith('/api/stream/live-input')) {
        return handleStreamEndpoints(request, env, corsHeaders);
      }

      if (path.startsWith('/api/recording')) {
        return handleRecordingEndpoints(request, env, corsHeaders);
      }

      if (path.startsWith('/api/youtube')) {
        return handleYouTubeEndpoints(request, env, corsHeaders);
      }

      if (path.startsWith('/api/twitch/auth')) {
        return handleTwitchEndpoints(request, env, corsHeaders);
      }

      if (path.startsWith('/api/facebook/auth')) {
        return handleFacebookEndpoints(request, env, corsHeaders);
      }

      if (path.startsWith('/api/rtmp')) {
        return handleRtmpEndpoints(request, env, corsHeaders);
      }

      return new Response('Stageroom API', {
        headers: { 'Content-Type': 'text/plain', ...corsHeaders },
      });
    } catch (error: any) {
      return jsonResponse({ error: error.message }, 500, corsHeaders);
    }
  },
};

function jsonResponse(data: any, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function requireAuth(request: Request, env: Env): Promise<{ userId: string; email: string; name?: string } | null> {
  const token = getClerkAuthHeader(request);
  if (!token) return Promise.resolve(null);
  return verifyClerkToken(env, token);
}

async function handleClerkAuth(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const path = new URL(request.url).pathname;

  if (path === '/api/auth/clerk-webhook' && request.method === 'POST') {
    const body = await request.json();

    if (body.type === 'user.created' || body.type === 'user.updated') {
      const clerkData = {
        userId: body.data.id,
        email: body.data.email_addresses?.[0]?.email_address || '',
        name: `${body.data.first_name || ''} ${body.data.last_name || ''}`.trim() || undefined,
      };

      await syncUserToDB(env.DB, clerkData);
      return jsonResponse({ success: true }, 200, corsHeaders);
    }

    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  if (path === '/api/auth/clerk/verify' && request.method === 'POST') {
    const { token } = await request.json();
    if (!token) return jsonResponse({ error: 'Missing token' }, 400, corsHeaders);

    const user = await verifyClerkToken(env, token);
    if (!user) return jsonResponse({ error: 'Invalid token' }, 401, corsHeaders);

    const dbUser = await syncUserToDB(env.DB, user);
    return jsonResponse({ user: dbUser }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

async function handleEvents(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const auth = await requireAuth(request, env);

  if (!auth) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);

  const user = await getUserByClerkId(env.DB, auth.userId);
  if (!user) return jsonResponse({ error: 'User not found in database' }, 404, corsHeaders);

  if (path === '/api/events' && request.method === 'POST') {
    const body = await request.json();
    if (!body.title || !body.start_time) {
      return jsonResponse({ error: 'Missing title or start_time' }, 400, corsHeaders);
    }

    const event = await createEvent(env.DB, {
      user_id: user.id,
      title: body.title,
      description: body.description,
      start_time: body.start_time,
      end_time: body.end_time,
      ticket_type: body.ticket_type || 'free',
      ticket_price: body.ticket_price || 0,
      currency: body.currency || 'USD',
      max_tickets: body.max_tickets,
      livekit_room: body.livekit_room,
      stream_url: body.stream_url,
    });

    const qrCode = crypto.randomUUID().substring(0, 12);
    const qrUrl = `${url.origin}/watch/${qrCode}`;

    await env.DB.prepare(
      'INSERT INTO qr_codes (id, event_id, code, url) VALUES (?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), event.id, qrCode, qrUrl).run();

    await env.DB.prepare('UPDATE events SET qr_code_url = ? WHERE id = ?').bind(qrUrl, event.id).run();

    return jsonResponse({ event, qr_code: qrCode, qr_url: qrUrl }, 201, corsHeaders);
  }

  if (path === '/api/events' && request.method === 'GET') {
    const status = url.searchParams.get('status') || undefined;
    const events = await listEvents(env.DB, user.id, status);
    return jsonResponse({ events }, 200, corsHeaders);
  }

  const eventId = path.split('/').pop();

  if (path.match(/^\/api\/events\/[^\/]+$/) && request.method === 'GET') {
    const event = await getEvent(env.DB, eventId!);
    if (!event) return jsonResponse({ error: 'Event not found' }, 404, corsHeaders);
    if (event.user_id !== user.id) return jsonResponse({ error: 'Forbidden' }, 403, corsHeaders);

    const config = await getDonationConfig(env.DB, eventId!);
    const ticketCount = await countEventTickets(env.DB, eventId!);
    const guestCount = await countEventGuests(env.DB, eventId!);

    return jsonResponse({ event, donation_config: config, ticket_count: ticketCount, guest_count: guestCount }, 200, corsHeaders);
  }

  if (path.match(/^\/api\/events\/[^\/]+$/) && request.method === 'PUT') {
    const event = await getEvent(env.DB, eventId!);
    if (!event) return jsonResponse({ error: 'Event not found' }, 404, corsHeaders);
    if (event.user_id !== user.id) return jsonResponse({ error: 'Forbidden' }, 403, corsHeaders);

    const body = await request.json();
    const updated = await updateEvent(env.DB, eventId!, body);
    return jsonResponse({ event: updated }, 200, corsHeaders);
  }

  if (path.match(/^\/api\/events\/[^\/]+$/) && request.method === 'DELETE') {
    const event = await getEvent(env.DB, eventId!);
    if (!event) return jsonResponse({ error: 'Event not found' }, 404, corsHeaders);
    if (event.user_id !== user.id) return jsonResponse({ error: 'Forbidden' }, 403, corsHeaders);

    await deleteEvent(env.DB, eventId!);
    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  if (path.match(/^\/api\/events\/[^\/]+\/donation-config$/) && request.method === 'PUT') {
    const event = await getEvent(env.DB, eventId!);
    if (!event) return jsonResponse({ error: 'Event not found' }, 404, corsHeaders);
    if (event.user_id !== user.id) return jsonResponse({ error: 'Forbidden' }, 403, corsHeaders);

    const body = await request.json();
    const config = await updateDonationConfig(env.DB, eventId!, body);
    return jsonResponse({ config }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

async function handleTickets(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/tickets' && request.method === 'POST') {
    const body = await request.json();
    if (!body.event_id) return jsonResponse({ error: 'Missing event_id' }, 400, corsHeaders);

    const event = await getEvent(env.DB, body.event_id);
    if (!event) return jsonResponse({ error: 'Event not found' }, 404, corsHeaders);

    const ticket = await createTicket(env.DB, {
      event_id: body.event_id,
      user_id: body.user_id || null,
      guest_email: body.guest_email,
      guest_name: body.guest_name,
    });

    if (event.ticket_type === 'free') {
      await confirmTicket(env.DB, ticket.id);
    }

    return jsonResponse({ ticket }, 201, corsHeaders);
  }

  const ticketId = path.split('/').pop();
  if (path.match(/^\/api\/tickets\/[^\/]+$/) && request.method === 'GET') {
    const ticket = await getTicket(env.DB, ticketId!);
    if (!ticket) return jsonResponse({ error: 'Ticket not found' }, 404, corsHeaders);
    return jsonResponse({ ticket }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

async function handleDonations(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/donations' && request.method === 'POST') {
    const body = await request.json();
    if (!body.event_id || !body.amount) return jsonResponse({ error: 'Missing event_id or amount' }, 400, corsHeaders);

    const event = await getEvent(env.DB, body.event_id);
    if (!event) return jsonResponse({ error: 'Event not found' }, 404, corsHeaders);

    const config = await getDonationConfig(env.DB, body.event_id);
    if (!config || !config.enabled) return jsonResponse({ error: 'Donations not enabled for this event' }, 400, corsHeaders);

    const paymentId = crypto.randomUUID();
    const payment = await createPayment(env.DB, {
      provider: 'paystack',
      provider_payment_id: paymentId,
      amount: body.amount,
      currency: body.currency || 'USD',
      type: 'donation',
      event_id: body.event_id,
    });

    const donation = await createDonation(env.DB, {
      event_id: body.event_id,
      guest_email: body.guest_email,
      guest_name: body.guest_name,
      amount: body.amount,
      type: body.type || 'general',
      currency: body.currency || 'USD',
      payment_id: payment.id,
      payment_provider: 'paystack',
    });

    return jsonResponse({ donation, payment }, 201, corsHeaders);
  }

  if (path === '/api/donations/paystack/initialize' && request.method === 'POST') {
    const body = await request.json();
    if (!body.event_id || !body.amount || !body.email) {
      return jsonResponse({ error: 'Missing event_id, amount, or email' }, 400, corsHeaders);
    }

    const event = await getEvent(env.DB, body.event_id);
    if (!event) return jsonResponse({ error: 'Event not found' }, 404, corsHeaders);

    const reference = `don_${body.event_id}_${Date.now()}`;
    const paystackData = await initializePaystackPayment(env, {
      email: body.email,
      amount: body.amount,
      reference,
      callback_url: body.callback_url || `${url.origin}/donations/callback`,
      metadata: { event_id: body.event_id, type: body.type || 'donation' },
    });

    return jsonResponse({ authorization_url: paystackData.authorization_url, reference }, 200, corsHeaders);
  }

  if (path.match(/^\/api\/donations\/event\/[^\/]+$/) && request.method === 'GET') {
    const eventId = path.split('/').pop();
    const type = url.searchParams.get('type') || undefined;
    const donations = await listEventDonations(env.DB, eventId!, type);
    const stats = await getDonationStats(env.DB, eventId!);
    return jsonResponse({ donations, stats }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

async function handleGuests(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/guests/register' && request.method === 'POST') {
    const body = await request.json();
    if (!body.event_id || !body.name || !body.email) {
      return jsonResponse({ error: 'Missing event_id, name, or email' }, 400, corsHeaders);
    }

    const event = await getEvent(env.DB, body.event_id);
    if (!event) return jsonResponse({ error: 'Event not found' }, 404, corsHeaders);

    const existing = await getGuestByEmail(env.DB, body.event_id, body.email);
    if (existing) return jsonResponse({ guest: existing, already_registered: true }, 200, corsHeaders);

    const guest = await registerGuest(env.DB, {
      event_id: body.event_id,
      name: body.name,
      email: body.email,
    });

    return jsonResponse({ guest }, 201, corsHeaders);
  }

  if (path === '/api/guests/join' && request.method === 'POST') {
    const body = await request.json();
    if (!body.access_code) return jsonResponse({ error: 'Missing access_code' }, 400, corsHeaders);

    const guest = await getGuestByAccessCode(env.DB, body.access_code);
    if (!guest) return jsonResponse({ error: 'Invalid access code' }, 404, corsHeaders);

    await markGuestJoined(env.DB, guest.id);

    const event = await getEvent(env.DB, guest.event_id);
    return jsonResponse({ guest, event }, 200, corsHeaders);
  }

  const guestId = path.split('/').pop();
  if (path.match(/^\/api\/guests\/[^\/]+$/) && request.method === 'GET') {
    const guest = await getGuest(env.DB, guestId!);
    if (!guest) return jsonResponse({ error: 'Guest not found' }, 404, corsHeaders);
    return jsonResponse({ guest }, 200, corsHeaders);
  }

  if (path.match(/^\/api\/guests\/event\/[^\/]+$/) && request.method === 'GET') {
    const eventId = path.split('/').pop();
    const guests = await listEventGuests(env.DB, eventId!);
    return jsonResponse({ guests }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

async function handlePayments(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/payments/paystack/webhook' && request.method === 'POST') {
    const body = await request.json();

    if (body.event === 'charge.success') {
      const reference = body.data.reference;
      const verification = await verifyPaystackPayment(env, reference);

      if (verification.status === 'success') {
        const payment = await getPaymentByProviderId(env.DB, 'paystack', reference);
        if (payment) {
          await updatePaymentStatus(env.DB, payment.id, 'completed');

          if (payment.type === 'ticket' && payment.event_id) {
            await env.DB.prepare('UPDATE tickets SET status = ? WHERE payment_id = ?').bind('confirmed', payment.id).run();
          }
        }
      }
    }

    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  if (path.match(/^\/api\/payments\/event\/[^\/]+$/) && request.method === 'GET') {
    const eventId = path.split('/').pop();
    const type = url.searchParams.get('type') || undefined;
    const payments = await listEventPayments(env.DB, eventId!, type);
    const revenue = await sumEventRevenue(env.DB, eventId!);
    return jsonResponse({ payments, revenue }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

async function handleLiveKitToken(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);

  const body = await request.json();
  if (!body.identity || !body.room) {
    return jsonResponse({ error: 'Missing identity or room' }, 400, corsHeaders);
  }

  const token = await generateLiveKitToken(env, {
    identity: body.identity,
    room: body.room,
    name: body.name,
    isHost: body.isHost || false,
    expiresIn: body.expiresIn || 3600,
  });

  return jsonResponse({ token }, 200, corsHeaders);
}

async function handleStreamEndpoints(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/stream/live-input' && request.method === 'POST') {
    const liveInput = await createLiveInput(env);
    return jsonResponse(liveInput, 201, corsHeaders);
  }

  if (path === '/api/stream/live-inputs' && request.method === 'GET') {
    const liveInputs = await listLiveInputs(env);
    return jsonResponse(liveInputs, 200, corsHeaders);
  }

  if (path.match(/^\/api\/stream\/live-input\/[^\/]+$/)) {
    const uid = path.split('/').pop();
    if (!uid) return jsonResponse({ error: 'Missing UID' }, 400, corsHeaders);

    if (request.method === 'GET') {
      const liveInput = await getLiveInput(env, uid);
      return jsonResponse(liveInput, 200, corsHeaders);
    }

    if (request.method === 'DELETE') {
      await deleteLiveInput(env, uid);
      return new Response(null, { status: 204, headers: corsHeaders });
    }
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

async function handleRecordingEndpoints(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/recording/start' && request.method === 'POST') {
    const { liveInputUid } = await request.json();
    if (!liveInputUid) return jsonResponse({ error: 'Missing liveInputUid' }, 400, corsHeaders);
    await startRecording(env, liveInputUid);
    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  if (path.match(/^\/api\/recording\/live-input\/[^\/]+$/)) {
    const liveInputUid = path.split('/').pop();
    if (!liveInputUid) return jsonResponse({ error: 'Missing UID' }, 400, corsHeaders);
    const recordings = await getLiveInputRecordings(env, liveInputUid);
    return jsonResponse(recordings, 200, corsHeaders);
  }

  if (path === '/api/recording/archive' && request.method === 'POST') {
    const { videoUid, r2Key } = await request.json();
    if (!videoUid || !r2Key) return jsonResponse({ error: 'Missing videoUid or r2Key' }, 400, corsHeaders);
    await archiveRecordingToR2(env, videoUid, r2Key);
    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  if (path.match(/^\/api\/recording\/stream\/[^\/]+$/)) {
    const videoUid = path.split('/').pop();
    if (!videoUid) return jsonResponse({ error: 'Missing UID' }, 400, corsHeaders);
    await deleteRecordingFromStream(env, videoUid);
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

async function handleYouTubeEndpoints(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/youtube/auth/url' && request.method === 'GET') {
    const { state, redirect_uri } = await request.json();
    if (!state || !redirect_uri) return jsonResponse({ error: 'Missing state or redirect_uri' }, 400, corsHeaders);
    const youtubeService = new YouTubeService(env);
    const authUrl = youtubeService.getAuthUrl(state, redirect_uri);
    return jsonResponse({ authUrl }, 200, corsHeaders);
  }

  if (path === '/api/youtube/auth/callback' && request.method === 'POST') {
    const { code, redirect_uri } = await request.json();
    if (!code || !redirect_uri) return jsonResponse({ error: 'Missing code or redirect_uri' }, 400, corsHeaders);
    const youtubeService = new YouTubeService(env);
    const tokens = await youtubeService.exchangeCode(code, redirect_uri);
    return jsonResponse(tokens, 200, corsHeaders);
  }

  if (path === '/api/youtube/auth/refresh' && request.method === 'POST') {
    const { refresh_token } = await request.json();
    if (!refresh_token) return jsonResponse({ error: 'Missing refresh_token' }, 400, corsHeaders);
    const youtubeService = new YouTubeService(env);
    const tokens = await youtubeService.refreshToken(refresh_token);
    return jsonResponse(tokens, 200, corsHeaders);
  }

  if (path === '/api/youtube/broadcast' && request.method === 'POST') {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
    const accessToken = authHeader.substring(7);
    const { title, description, scheduledStartTime, scheduledEndTime, privacyStatus } = await request.json();
    if (!title) return jsonResponse({ error: 'Missing title' }, 400, corsHeaders);
    const youtubeService = new YouTubeService(env);
    const broadcast = await youtubeService.createBroadcast(accessToken, { title, description, scheduledStartTime, scheduledEndTime, privacyStatus });
    return jsonResponse(broadcast, 201, corsHeaders);
  }

  if (path === '/api/youtube/stream' && request.method === 'POST') {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
    const accessToken = authHeader.substring(7);
    const { title, description } = await request.json();
    if (!title) return jsonResponse({ error: 'Missing title' }, 400, corsHeaders);
    const youtubeService = new YouTubeService(env);
    const stream = await youtubeService.createStream(accessToken, { title, description });
    return jsonResponse(stream, 201, corsHeaders);
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

async function handleTwitchEndpoints(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/twitch/auth/url' && request.method === 'GET') {
    const { state, redirect_uri } = await request.json();
    if (!state || !redirect_uri) return jsonResponse({ error: 'Missing state or redirect_uri' }, 400, corsHeaders);
    const twitchService = new TwitchService(env);
    const authUrl = twitchService.getAuthUrl(state, redirect_uri);
    return jsonResponse({ authUrl }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

async function handleFacebookEndpoints(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/facebook/auth/url' && request.method === 'GET') {
    const { state, redirect_uri } = await request.json();
    if (!state || !redirect_uri) return jsonResponse({ error: 'Missing state or redirect_uri' }, 400, corsHeaders);
    const facebookService = new FacebookService(env);
    const authUrl = facebookService.getAuthUrl(state, redirect_uri);
    return jsonResponse({ authUrl }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

async function handleRtmpEndpoints(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/rtmp/validate' && request.method === 'POST') {
    const { rtmpUrl, streamKey } = await request.json();
    if (!rtmpUrl || !streamKey) return jsonResponse({ error: 'Missing rtmpUrl or streamKey' }, 400, corsHeaders);
    const rtmpService = new RtmpService(env);
    const isValid = await rtmpService.validateConnection({ rtmpUrl, streamKey });
    if (!isValid) return jsonResponse({ error: 'Invalid RTMP URL or stream key' }, 400, corsHeaders);
    const config = rtmpService.createStreamConfig({ rtmpUrl, streamKey });
    return jsonResponse(config, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}
