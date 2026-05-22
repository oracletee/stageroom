import { Env } from './db/schema';
import { runMigrations } from './db/migrations';
import { createEvent, getEvent, listEvents, updateEvent, deleteEvent, getDonationConfig, createDonationConfig, updateDonationConfig } from './db/events';
import { createTicket, getTicket, listEventTickets, confirmTicket, countEventTickets } from './db/tickets';
import { createDonation, getDonation, listEventDonations, sumEventDonations, getDonationStats } from './db/donations';
import { createDonationType, listEventDonationTypes, updateDonationType, deleteDonationType } from './db/donationTypes';
import { createTicketType, listEventTicketTypes, updateTicketType, deleteTicketType } from './db/ticketTypes';
import { getUserSettings, upsertUserSettings } from './db/userSettings';
import { registerGuest, getGuest, getGuestByAccessCode, getGuestByEmail, listEventGuests, markGuestJoined, countEventGuests } from './db/guests';
import { createPayment, getPayment, getPaymentByProviderId, updatePaymentStatus, listEventPayments, sumEventRevenue } from './db/payments';
import { signUp, signIn, authenticateRequest } from './auth/local';
import { generateLiveKitToken } from './livekit/token';
import { initializePaystackPayment, verifyPaystackPayment } from './payments/paystack';
import { uploadPoster } from './storage/poster';
import { uploadSourceMedia, getSourceMedia } from './storage/sourceMedia';
import { createLiveInput, listLiveInputs, getLiveInput, deleteLiveInput, updateLiveInputRecording } from './stream/index';
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

      if (path === '/api/cleanup/source-duplicates' && request.method === 'POST') {
        const { results: dups } = await env.DB.prepare(
          `SELECT id FROM sources GROUP BY id HAVING COUNT(*) > 1`
        ).all();
        let deleted = 0;
        for (const row of dups || []) {
          const { results: rows } = await env.DB.prepare(
            `SELECT rowid FROM sources WHERE id = ? ORDER BY created_at ASC`
          ).bind(row.id).all();
          const keep = (rows || [])[0]?.rowid;
          if (keep) {
            const info = await env.DB.prepare(
              `DELETE FROM sources WHERE id = ? AND rowid != ?`
            ).bind(row.id, keep).run();
            deleted += info.meta.changes;
          }
        }
        return jsonResponse({ deleted, duplicatesFound: (dups || []).length }, 200, corsHeaders);
      }

      if (path.startsWith('/api/auth')) {
        return handleAuth(request, env, corsHeaders);
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

      if (path.startsWith('/api/settings')) {
        return handleSettings(request, env, corsHeaders);
      }

      if (path.startsWith('/api/stream/whip-proxy') || path.startsWith('/api/stream/live-input')) {
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

      if (path.startsWith('/api/sources')) {
        return handleSourceEndpoints(request, env, corsHeaders);
      }

      if (path.startsWith('/api/scenes')) {
        return handleSceneEndpoints(request, env, corsHeaders);
      }

      if (path.startsWith('/api/studio/config')) {
        return handleStudioConfigEndpoints(request, env, corsHeaders);
      }

      if (path.startsWith('/api/destinations')) {
        return handleDestinationEndpoints(request, env, corsHeaders);
      }

      if (path.startsWith('/api/stream/sessions')) {
        return handleStreamSessionEndpoints(request, env, corsHeaders);
      }

      if (path.startsWith('/api/upload')) {
        return handleUploadEndpoints(request, env, corsHeaders);
      }

      if (path.startsWith('/api/media')) {
        return handleUploadEndpoints(request, env, corsHeaders);
      }

      if (path.startsWith('/api/stream/schedule')) {
        return handleScheduleEndpoints(request, env, corsHeaders);
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

async function requireAuth(request: Request, env: Env): Promise<User | null> {
  return await authenticateRequest(request, env.DB, env.JWT_SECRET);
}

async function handleAuth(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const path = new URL(request.url).pathname;

  if (path === '/api/auth/sign-up' && request.method === 'POST') {
    const body = await request.json();
    if (!body.email || !body.password) {
      return jsonResponse({ error: 'Missing email or password' }, 400, corsHeaders);
    }

    const result = await signUp(env.DB, env.JWT_SECRET, {
      email: body.email,
      password: body.password,
      name: body.name,
    });

    if ('error' in result) {
      return jsonResponse({ error: result.error }, 400, corsHeaders);
    }

    return jsonResponse({ user: result.user, token: result.token }, 201, corsHeaders);
  }

  if (path === '/api/auth/sign-in' && request.method === 'POST') {
    const body = await request.json();
    if (!body.email || !body.password) {
      return jsonResponse({ error: 'Missing email or password' }, 400, corsHeaders);
    }

    const result = await signIn(env.DB, env.JWT_SECRET, {
      email: body.email,
      password: body.password,
    });

    if ('error' in result) {
      return jsonResponse({ error: result.error }, 401, corsHeaders);
    }

    return jsonResponse({ user: result.user, token: result.token }, 200, corsHeaders);
  }

  if (path === '/api/auth/me' && request.method === 'GET') {
    const user = await requireAuth(request, env);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
    return jsonResponse({ user }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

async function handleEvents(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const user = await requireAuth(request, env);

  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);

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
      category: body.category,
      poster_url: body.poster_url,
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

    const eventsWithTickets = await Promise.all(events.map(async (event) => {
      try {
        const ticketTypes = await listEventTicketTypes(env.DB, event.id);
        return { ...event, ticket_types: ticketTypes };
      } catch {
        return { ...event, ticket_types: [] };
      }
    }));

    return jsonResponse({ events: eventsWithTickets }, 200, corsHeaders);
  }

  const parts = path.split('/');
  const eventId = parts[3];

  if (path.match(/^\/api\/events\/[^\/]+$/) && request.method === 'GET') {
    const event = await getEvent(env.DB, eventId!);
    if (!event) return jsonResponse({ error: 'Event not found' }, 404, corsHeaders);
    if (event.user_id !== user.id) return jsonResponse({ error: 'Forbidden' }, 403, corsHeaders);

    const config = await getDonationConfig(env.DB, eventId!);
    const donationTypes = await listEventDonationTypes(env.DB, eventId!);
    const ticketTypes = await listEventTicketTypes(env.DB, eventId!);
    const ticketCount = await countEventTickets(env.DB, eventId!);
    const guestCount = await countEventGuests(env.DB, eventId!);

    return jsonResponse({ event, donation_config: config, donation_types: donationTypes, ticket_types: ticketTypes, ticket_count: ticketCount, guest_count: guestCount }, 200, corsHeaders);
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

  if (path.match(/^\/api\/events\/[^\/]+\/donation-types$/) && request.method === 'POST') {
    const event = await getEvent(env.DB, eventId!);
    if (!event) return jsonResponse({ error: 'Event not found' }, 404, corsHeaders);
    if (event.user_id !== user.id) return jsonResponse({ error: 'Forbidden' }, 403, corsHeaders);

    const body = await request.json();
    if (!body.name) return jsonResponse({ error: 'Missing name' }, 400, corsHeaders);

    const donationType = await createDonationType(env.DB, {
      event_id: eventId!,
      name: body.name,
      preset_amounts: body.preset_amounts,
      custom_amount_enabled: body.custom_amount_enabled,
    });
    return jsonResponse({ donation_type: donationType }, 201, corsHeaders);
  }

  if (path.match(/^\/api\/events\/[^\/]+\/donation-types$/) && request.method === 'GET') {
    const event = await getEvent(env.DB, eventId!);
    if (!event) return jsonResponse({ error: 'Event not found' }, 404, corsHeaders);
    if (event.user_id !== user.id) return jsonResponse({ error: 'Forbidden' }, 403, corsHeaders);

    const donationTypes = await listEventDonationTypes(env.DB, eventId!);
    return jsonResponse({ donation_types: donationTypes }, 200, corsHeaders);
  }

  if (path.match(/^\/api\/events\/[^\/]+\/donation-types\/[^\/]+$/) && request.method === 'PUT') {
    const event = await getEvent(env.DB, eventId!);
    if (!event) return jsonResponse({ error: 'Event not found' }, 404, corsHeaders);
    if (event.user_id !== user.id) return jsonResponse({ error: 'Forbidden' }, 403, corsHeaders);

    const typeId = path.split('/').pop();
    const body = await request.json();
    const updated = await updateDonationType(env.DB, typeId!, body);
    return jsonResponse({ donation_type: updated }, 200, corsHeaders);
  }

  if (path.match(/^\/api\/events\/[^\/]+\/donation-types\/[^\/]+$/) && request.method === 'DELETE') {
    const event = await getEvent(env.DB, eventId!);
    if (!event) return jsonResponse({ error: 'Event not found' }, 404, corsHeaders);
    if (event.user_id !== user.id) return jsonResponse({ error: 'Forbidden' }, 403, corsHeaders);

    const typeId = path.split('/').pop();
    await deleteDonationType(env.DB, typeId!);
    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  if (path.match(/^\/api\/events\/[^\/]+\/poster$/) && request.method === 'POST') {
    const event = await getEvent(env.DB, eventId!);
    if (!event) return jsonResponse({ error: 'Event not found' }, 404, corsHeaders);
    if (event.user_id !== user.id) return jsonResponse({ error: 'Forbidden' }, 403, corsHeaders);

    const contentType = request.headers.get('Content-Type') || 'image/jpeg';
    const body = await request.arrayBuffer();
    const posterUrl = await uploadPoster(env, eventId!, body, contentType);

    await updateEvent(env.DB, eventId!, { poster_url: posterUrl });
    return jsonResponse({ poster_url: posterUrl }, 200, corsHeaders);
  }

  if (path.match(/^\/api\/events\/[^\/]+\/ticket-types$/) && request.method === 'POST') {
    const event = await getEvent(env.DB, eventId!);
    if (!event) return jsonResponse({ error: 'Event not found' }, 404, corsHeaders);
    if (event.user_id !== user.id) return jsonResponse({ error: 'Forbidden' }, 403, corsHeaders);

    const body = await request.json();
    if (!body.name) return jsonResponse({ error: 'Missing name' }, 400, corsHeaders);

    const ticketType = await createTicketType(env.DB, {
      event_id: eventId!,
      name: body.name,
      type: body.type || 'free',
      price: body.price || 0,
      currency: body.currency || 'USD',
      max_quantity: body.max_quantity,
    });
    return jsonResponse({ ticket_type: ticketType }, 201, corsHeaders);
  }

  if (path.match(/^\/api\/events\/[^\/]+\/ticket-types$/) && request.method === 'GET') {
    const event = await getEvent(env.DB, eventId!);
    if (!event) return jsonResponse({ error: 'Event not found' }, 404, corsHeaders);
    if (event.user_id !== user.id) return jsonResponse({ error: 'Forbidden' }, 403, corsHeaders);

    const ticketTypes = await listEventTicketTypes(env.DB, eventId!);
    return jsonResponse({ ticket_types: ticketTypes }, 200, corsHeaders);
  }

  if (path.match(/^\/api\/events\/[^\/]+\/ticket-types\/[^\/]+$/) && request.method === 'PUT') {
    const event = await getEvent(env.DB, eventId!);
    if (!event) return jsonResponse({ error: 'Event not found' }, 404, corsHeaders);
    if (event.user_id !== user.id) return jsonResponse({ error: 'Forbidden' }, 403, corsHeaders);

    const typeId = path.split('/').pop();
    const body = await request.json();
    const updated = await updateTicketType(env.DB, typeId!, body);
    return jsonResponse({ ticket_type: updated }, 200, corsHeaders);
  }

  if (path.match(/^\/api\/events\/[^\/]+\/ticket-types\/[^\/]+$/) && request.method === 'DELETE') {
    const event = await getEvent(env.DB, eventId!);
    if (!event) return jsonResponse({ error: 'Event not found' }, 404, corsHeaders);
    if (event.user_id !== user.id) return jsonResponse({ error: 'Forbidden' }, 403, corsHeaders);

    const typeId = path.split('/').pop();
    await deleteTicketType(env.DB, typeId!);
    return jsonResponse({ success: true }, 200, corsHeaders);
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

  if (path === '/api/stream/whip-proxy' && request.method === 'POST') {
    const { whipUrl, sdp, whipToken } = await request.json();
    if (!whipUrl || !sdp) return jsonResponse({ error: 'Missing whipUrl or sdp' }, 400, corsHeaders);

    const whipHeaders: Record<string, string> = { 'Content-Type': 'application/sdp' };
    if (whipToken) whipHeaders['Authorization'] = `Bearer ${whipToken}`;

    try {
      const whipRes = await fetch(whipUrl, {
        method: 'POST',
        headers: whipHeaders,
        body: sdp,
      });
      const answerSdp = await whipRes.text();
      const sessionUrl = whipRes.headers.get('location') || whipRes.headers.get('Location') || '';
      return jsonResponse({
        status: whipRes.status,
        statusText: whipRes.statusText,
        answerSdp,
        sessionUrl,
      }, whipRes.ok ? 200 : 502, corsHeaders);
    } catch (err: any) {
      return jsonResponse({ error: err.message }, 502, corsHeaders);
    }
  }

  if (path === '/api/stream/whip-proxy/trickle' && request.method === 'POST') {
    const { sessionUrl, sdpFragment, whipToken } = await request.json();
    if (!sessionUrl || !sdpFragment) return jsonResponse({ error: 'Missing sessionUrl or sdpFragment' }, 400, corsHeaders);

    const patchHeaders: Record<string, string> = { 'Content-Type': 'application/trickle-ice-sdpfrag' };
    if (whipToken) patchHeaders['Authorization'] = `Bearer ${whipToken}`;

    try {
      const patchRes = await fetch(sessionUrl, {
        method: 'PATCH',
        headers: patchHeaders,
        body: sdpFragment,
      });
      return jsonResponse({ status: patchRes.status, statusText: patchRes.statusText }, 200, corsHeaders);
    } catch (err: any) {
      return jsonResponse({ error: err.message }, 502, corsHeaders);
    }
  }

  if (path.match(/^\/api\/stream\/live-input\/[^\/]+\/recording$/) && request.method === 'PUT') {
    const parts = path.split('/');
    const uid = parts[4];
    if (!uid) return jsonResponse({ error: 'Missing UID' }, 400, corsHeaders);
    const body = await request.json();
    if (body.enabled === undefined) return jsonResponse({ error: 'Missing enabled' }, 400, corsHeaders);
    await updateLiveInputRecording(env, uid, body.enabled);
    return jsonResponse({ success: true }, 200, corsHeaders);
  }

   if (path === '/api/stream/live-input' && request.method === 'POST') {
     console.log('[StreamHandler] Creating live input...');
     const liveInput = await createLiveInput(env);
     console.log('[StreamHandler] Live input created:', liveInput);
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

    if (request.method === 'PUT') {
      const body = await request.json();
      return jsonResponse({ success: true }, 200, corsHeaders);
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

async function handleSettings(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const user = await requireAuth(request, env);

  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);

  if (path === '/api/settings/payment' && request.method === 'GET') {
    const settings = await getUserSettings(env.DB, user.id);
    return jsonResponse({ settings }, 200, corsHeaders);
  }

  if (path === '/api/settings/payment' && request.method === 'PUT') {
    const body = await request.json();
    const settings = await upsertUserSettings(env.DB, user.id, {
      paystack_secret_key: body.paystack_secret_key,
      paystack_public_key: body.paystack_public_key,
      stripe_secret_key: body.stripe_secret_key,
      stripe_publishable_key: body.stripe_publishable_key,
    });
    return jsonResponse({ settings }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

async function handleSourceEndpoints(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const user = await requireAuth(request, env);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);

  if (path === '/api/sources' && request.method === 'POST') {
    const body = await request.json();
    const id = body.id || crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO sources (id, user_id, scene_id, type, label, config, live_input_uid, playback_url, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, user.id, body.sceneId || null, body.type, body.label, JSON.stringify(body.config || {}), body.liveInputUid || null, body.playbackUrl || null, body.isActive !== false ? 1 : 0).run();

    if (body.sceneId) {
      const { results: sceneRows } = await env.DB.prepare('SELECT source_ids FROM scenes WHERE id = ? AND user_id = ?').bind(body.sceneId, user.id).all();
      if (sceneRows?.[0]) {
        const existingIds = JSON.parse(sceneRows[0].source_ids || '[]');
        if (!existingIds.includes(id)) {
          existingIds.push(id);
          await env.DB.prepare('UPDATE scenes SET source_ids = ? WHERE id = ?').bind(JSON.stringify(existingIds), body.sceneId).run();
        }
      }
    }

    return jsonResponse({ id, type: body.type, label: body.label }, 201, corsHeaders);
  }

  if (path === '/api/sources' && request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM sources WHERE user_id = ? ORDER BY created_at ASC').bind(user.id).all();
    return jsonResponse({ sources: results }, 200, corsHeaders);
  }

  if (path.match(/^\/api\/sources\/[^\/]+$/) && request.method === 'DELETE') {
    const sourceId = path.split('/').pop();
    const { results } = await env.DB.prepare('SELECT live_input_uid FROM sources WHERE id = ? AND user_id = ?').bind(sourceId, user.id).all();
    if (results?.[0]?.live_input_uid) {
      try {
        await deleteLiveInput(env, results[0].live_input_uid as string);
      } catch (e) {
        // Live input may already be deleted
      }
    }
    await env.DB.prepare('DELETE FROM sources WHERE id = ? AND user_id = ?').bind(sourceId, user.id).run();
    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  if (path.match(/^\/api\/sources\/[^\/]+$/) && request.method === 'PUT') {
    const sourceId = path.split('/').pop();
    const body = await request.json();
    const updates: string[] = [];
    const values: any[] = [];
    if (body.label !== undefined) { updates.push('label = ?'); values.push(body.label); }
    if (body.config !== undefined) { updates.push('config = ?'); values.push(JSON.stringify(body.config)); }
    if (body.isActive !== undefined) { updates.push('is_active = ?'); values.push(body.isActive ? 1 : 0); }
    if (body.sceneId !== undefined) { updates.push('scene_id = ?'); values.push(body.sceneId); }
    if (body.liveInputUid !== undefined) { updates.push('live_input_uid = ?'); values.push(body.liveInputUid); }
    if (body.playbackUrl !== undefined) { updates.push('playback_url = ?'); values.push(body.playbackUrl); }
    if (updates.length === 0) return jsonResponse({ success: true }, 200, corsHeaders);
    values.push(sourceId, user.id);
    await env.DB.prepare(`UPDATE sources SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).bind(...values).run();
    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

async function handleSceneEndpoints(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const user = await requireAuth(request, env);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);

  if (path === '/api/scenes' && request.method === 'POST') {
    const body = await request.json();
    const id = body.id || crypto.randomUUID();
    await env.DB.prepare(
      'INSERT OR REPLACE INTO scenes (id, user_id, name, source_ids) VALUES (?, ?, ?, ?)'
    ).bind(id, user.id, body.name || 'New Scene', JSON.stringify(body.sourceIds || [])).run();
    return jsonResponse({ id, name: body.name || 'New Scene', sourceIds: body.sourceIds || [] }, 201, corsHeaders);
  }

  if (path === '/api/scenes' && request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM scenes WHERE user_id = ? ORDER BY created_at ASC').bind(user.id).all();
    return jsonResponse({ scenes: results }, 200, corsHeaders);
  }

  if (path.match(/^\/api\/scenes\/[^\/]+$/) && request.method === 'PUT') {
    const sceneId = path.split('/').pop();
    const body = await request.json();
    const updates: string[] = [];
    const values: any[] = [];
    if (body.name !== undefined) { updates.push('name = ?'); values.push(body.name); }
    if (body.sourceIds !== undefined) { updates.push('source_ids = ?'); values.push(JSON.stringify(body.sourceIds)); }
    if (updates.length === 0) return jsonResponse({ success: true }, 200, corsHeaders);
    values.push(sceneId, user.id);
    await env.DB.prepare(`UPDATE scenes SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).bind(...values).run();
    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  if (path.match(/^\/api\/scenes\/[^\/]+$/) && request.method === 'DELETE') {
    const sceneId = path.split('/').pop();
    await env.DB.prepare('DELETE FROM scenes WHERE id = ? AND user_id = ?').bind(sceneId, user.id).run();
    await env.DB.prepare('UPDATE sources SET scene_id = NULL WHERE scene_id = ? AND user_id = ?').bind(sceneId, user.id).run();
    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

async function handleStudioConfigEndpoints(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const user = await requireAuth(request, env);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);

  if (path === '/api/studio/config' && request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM user_studio_config WHERE user_id = ?').bind(user.id).all();
    const config = results?.[0] || null;
    const scenesRes = await env.DB.prepare('SELECT * FROM scenes WHERE user_id = ? ORDER BY created_at ASC').bind(user.id).all();
    const sourcesRes = await env.DB.prepare('SELECT * FROM sources WHERE user_id = ? ORDER BY created_at ASC').bind(user.id).all();
    return jsonResponse({
      config,
      scenes: scenesRes.results || [],
      sources: sourcesRes.results || [],
    }, 200, corsHeaders);
  }

  if (path === '/api/studio/config' && request.method === 'POST') {
    const body = await request.json();
    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT OR REPLACE INTO user_studio_config (id, user_id, selected_scene_id, program_scene_id, stage_mode, backstage_participants, spotlight_participants, setup_done, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id, user.id,
      body.selectedSceneId || null,
      body.programSceneId || null,
      body.stageMode || 'ted-talk',
      body.backstageParticipants || '[]',
      body.spotlightParticipants || '[]',
      body.setupDone ? 1 : 0,
      new Date().toISOString()
    ).run();
    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

async function handleDestinationEndpoints(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const user = await requireAuth(request, env);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);

  if (path === '/api/destinations' && request.method === 'POST') {
    const body = await request.json();
    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO stream_destinations (id, user_id, name, platform, rtmp_url, stream_key, is_enabled) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, user.id, body.name, body.platform, body.rtmpUrl || null, body.streamKey || null, body.isEnabled !== false ? 1 : 0).run();
    return jsonResponse({ id, name: body.name, platform: body.platform, isEnabled: body.isEnabled !== false }, 201, corsHeaders);
  }

  if (path === '/api/destinations' && request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM stream_destinations WHERE user_id = ? ORDER BY created_at ASC').bind(user.id).all();
    return jsonResponse({ destinations: results }, 200, corsHeaders);
  }

  if (path.match(/^\/api\/destinations\/[^\/]+$/) && request.method === 'PUT') {
    const destId = path.split('/').pop();
    const body = await request.json();
    const updates: string[] = [];
    const values: any[] = [];
    if (body.name !== undefined) { updates.push('name = ?'); values.push(body.name); }
    if (body.platform !== undefined) { updates.push('platform = ?'); values.push(body.platform); }
    if (body.rtmpUrl !== undefined) { updates.push('rtmp_url = ?'); values.push(body.rtmpUrl); }
    if (body.streamKey !== undefined) { updates.push('stream_key = ?'); values.push(body.streamKey); }
    if (body.isEnabled !== undefined) { updates.push('is_enabled = ?'); values.push(body.isEnabled ? 1 : 0); }
    if (updates.length === 0) return jsonResponse({ success: true }, 200, corsHeaders);
    values.push(destId, user.id);
    await env.DB.prepare(`UPDATE stream_destinations SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).bind(...values).run();
    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  if (path.match(/^\/api\/destinations\/[^\/]+$/) && request.method === 'DELETE') {
    const destId = path.split('/').pop();
    await env.DB.prepare('DELETE FROM stream_destinations WHERE id = ? AND user_id = ?').bind(destId, user.id).run();
    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

async function handleStreamSessionEndpoints(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const user = await requireAuth(request, env);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);

  if (path === '/api/stream/sessions' && request.method === 'POST') {
    const body = await request.json();
    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO stream_sessions (id, user_id, live_input_uid, status, platform, platform_broadcast_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, user.id, body.liveInputUid, 'active', body.platform || null, body.platformBroadcastId || null).run();
    return jsonResponse({ id, liveInputUid: body.liveInputUid, status: 'active', startedAt: new Date().toISOString() }, 201, corsHeaders);
  }

  if (path === '/api/stream/sessions' && request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM stream_sessions WHERE user_id = ? AND status = ? ORDER BY started_at DESC LIMIT 1'
    ).bind(user.id, 'active').all();
    return jsonResponse({ session: results?.[0] || null }, 200, corsHeaders);
  }

  if (path.match(/^\/api\/stream\/sessions\/[^\/]+\/stop$/) && request.method === 'POST') {
    const sessionId = path.split('/').slice(-2)[0];
    await env.DB.prepare(
      'UPDATE stream_sessions SET status = ?, ended_at = ? WHERE id = ? AND user_id = ?'
    ).bind('ended', new Date().toISOString(), sessionId, user.id).run();
    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

async function handleUploadEndpoints(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/upload' && request.method === 'POST') {
    const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
    const body = await request.arrayBuffer();
    if (!body || body.byteLength === 0) {
      return jsonResponse({ error: 'Empty file' }, 400, corsHeaders);
    }
    const key = await uploadSourceMedia(env, body, contentType);
    const mediaUrl = `${url.origin}/api/media/${key}`;
    return jsonResponse({ url: mediaUrl }, 201, corsHeaders);
  }

  if (path.startsWith('/api/media/') && request.method === 'GET') {
    const key = path.slice('/api/media/'.length);
    if (!key) return jsonResponse({ error: 'Missing key' }, 400, corsHeaders);
    const media = await getSourceMedia(env, key);
    if (!media) return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
    return new Response(media.body, {
      headers: { 'Content-Type': media.contentType, ...corsHeaders },
    });
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

async function handleScheduleEndpoints(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const user = await requireAuth(request, env);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);

  if (path === '/api/stream/schedule' && request.method === 'POST') {
    const body = await request.json();
    if (!body.title || !body.scheduledTime || !body.platform) {
      return jsonResponse({ error: 'Missing title, scheduledTime, or platform' }, 400, corsHeaders);
    }
    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO scheduled_streams (id, user_id, title, description, platform, platform_config, scheduled_time, duration, status, live_input_uid, event_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, user.id, body.title, body.description || null, body.platform, JSON.stringify(body.platformConfig || {}), body.scheduledTime, body.duration || 60, 'scheduled', body.liveInputUid || null, body.eventId || null).run();
    return jsonResponse({ id, title: body.title, platform: body.platform, scheduledTime: body.scheduledTime, status: 'scheduled' }, 201, corsHeaders);
  }

  if (path === '/api/stream/schedule' && request.method === 'GET') {
    const status = url.searchParams.get('status') || 'scheduled';
    const eventId = url.searchParams.get('eventId');
    let query = 'SELECT * FROM scheduled_streams WHERE user_id = ? AND status = ?';
    let params: any[] = [user.id, status];
    if (eventId) {
      query += ' AND event_id = ?';
      params.push(eventId);
    }
    query += ' ORDER BY scheduled_time ASC';
    const { results } = await env.DB.prepare(query).bind(...params).all();
    return jsonResponse({ scheduledStreams: results }, 200, corsHeaders);
  }

  if (path.match(/^\/api\/stream\/schedule\/[^\/]+$/) && request.method === 'DELETE') {
    const scheduleId = path.split('/').pop();
    await env.DB.prepare('UPDATE scheduled_streams SET status = ? WHERE id = ? AND user_id = ?').bind('cancelled', scheduleId, user.id).run();
    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  if (path.match(/^\/api\/stream\/schedule\/[^\/]+\/start$/) && request.method === 'POST') {
    const scheduleId = path.split('/').slice(-2)[0];
    await env.DB.prepare('UPDATE scheduled_streams SET status = ? WHERE id = ? AND user_id = ?').bind('live', scheduleId, user.id).run();
    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}
