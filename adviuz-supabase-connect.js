// ============================================================
// ADVIUZ — Supabase Connection Layer
// Paste your two keys below, then include this file in all
// three HTML pages before their closing </script> tag.
// ============================================================

const SUPABASE_URL = 'https://crhvvfomwkrgwlnfruad.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyaHZ2Zm9td2tyZ3dsbmZydWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMjA3MDYsImV4cCI6MjA5Mjc5NjcwNn0.lTHjU0bHTGGiTPJl04iefIenI6KiqiS3u2h_WyHZ0aw';

const SB = {
  url: SUPABASE_URL,
  key: SUPABASE_ANON_KEY,
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  },

  // ── Generic POST (insert row) ──────────────────────────────
  async insert(table, data) {
    try {
      const r = await fetch(`${this.url}/rest/v1/${table}`, {
        method: 'POST',
        headers: { ...this.headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(data)
      });
      if (!r.ok) { const e = await r.json(); console.error('[Adviuz DB]', e); return null; }
      return await r.json();
    } catch (e) { console.error('[Adviuz DB] Network error:', e); return null; }
  },

  // ── Generic GET with filters ───────────────────────────────
  async select(table, filters = '', order = '') {
    try {
      let url = `${this.url}/rest/v1/${table}?${filters}`;
      if (order) url += `&order=${order}`;
      const r = await fetch(url, { headers: this.headers });
      if (!r.ok) return [];
      return await r.json();
    } catch (e) { console.error('[Adviuz DB] Select error:', e); return []; }
  },

  // ── Generic PATCH (update) ─────────────────────────────────
  async update(table, filters, data) {
    try {
      const r = await fetch(`${this.url}/rest/v1/${table}?${filters}`, {
        method: 'PATCH',
        headers: { ...this.headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify(data)
      });
      return r.ok;
    } catch (e) { console.error('[Adviuz DB] Update error:', e); return false; }
  }
};

// ============================================================
// AD PAGE FUNCTIONS
// ============================================================

// Called when 25-second timer completes
async function countViewLive() {
  const p = new URLSearchParams(window.location.search);
  const payload = {
    ad_id:       p.get('ad_id')       || null,
    client_id:   p.get('client_id')   || null,
    campaign_id: p.get('campaign_id') || null,
    utm_source:  p.get('utm_source')  || 'direct',
    utm_medium:  p.get('utm_medium')  || null,
    utm_campaign:p.get('utm_campaign')|| null,
    platform:    p.get('utm_source')  || 'direct',
    device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    billed:      true,
    viewed_at:   new Date().toISOString()
  };
  // Remove null keys
  Object.keys(payload).forEach(k => payload[k] === null && delete payload[k]);
  const result = await SB.insert('view_events', payload);
  console.log('[Adviuz] View counted:', result ? 'success' : 'failed');
  return result;
}

// Called when inquiry form submitted on ad page
async function submitLeadLive(formData) {
  const p = new URLSearchParams(window.location.search);
  const payload = {
    client_id:   p.get('client_id')   || null,
    ad_id:       p.get('ad_id')       || null,
    campaign_id: p.get('campaign_id') || null,
    name:        formData.name,
    phone:       formData.phone,
    email:       formData.email       || null,
    interest:    formData.interest    || null,
    message:     formData.message     || null,
    source:      p.get('utm_source')  || 'direct',
    utm_campaign:p.get('utm_campaign')|| null,
    billing_model: 'views',           // ad page leads default to views model
    stage:       'New',
    ai_call_status: 'pending',
    submitted_at: new Date().toISOString()
  };
  Object.keys(payload).forEach(k => payload[k] === null && delete payload[k]);
  const result = await SB.insert('leads', payload);
  console.log('[Adviuz] Lead captured:', result ? 'success' : 'failed');
  return result;
}

// ============================================================
// CLIENT PANEL FUNCTIONS
// ============================================================

// Load campaign stats for client dashboard
async function loadClientDashboard(clientId) {
  const [summary, recentLeads, campaigns] = await Promise.all([
    SB.select('client_summary', `id=eq.${clientId}`),
    SB.select('leads', `client_id=eq.${clientId}&order=submitted_at.desc&limit=10`),
    SB.select('campaigns', `client_id=eq.${clientId}&order=created_at.desc`)
  ]);
  return {
    summary:      summary[0] || {},
    recentLeads:  recentLeads,
    campaigns:    campaigns
  };
}

// Load leads for client CRM
async function loadLeads(clientId, stage = null) {
  let filter = `client_id=eq.${clientId}`;
  if (stage) filter += `&stage=eq.${stage}`;
  return SB.select('leads', filter, 'submitted_at.desc');
}

// Update lead stage
async function updateLeadStage(leadId, newStage) {
  return SB.update('leads', `id=eq.${leadId}`, {
    stage: newStage,
    updated_at: new Date().toISOString()
  });
}

// Save lead notes
async function saveLeadNotes(leadId, notes) {
  return SB.update('leads', `id=eq.${leadId}`, { notes });
}

// Add activity log entry
async function logActivity(leadId, clientId, type, description) {
  return SB.insert('lead_activity', {
    lead_id: leadId,
    client_id: clientId,
    activity_type: type,
    description: description,
    performed_by: 'client'
  });
}

// Load meetings for client
async function loadMeetings(clientId) {
  return SB.select('meetings',
    `client_id=eq.${clientId}&scheduled_at=gte.${new Date().toISOString()}`,
    'scheduled_at.asc'
  );
}

// Schedule a meeting
async function scheduleMeeting(data) {
  return SB.insert('meetings', data);
}

// Toggle ad status (start/pause)
async function toggleAdStatus(adId, newStatus) {
  return SB.update('ads', `id=eq.${adId}`, {
    status: newStatus,
    updated_at: new Date().toISOString()
  });
}

// Load distribution report for client
async function loadDistributionReport(clientId) {
  return SB.select('distribution_report', `business_name=eq.${clientId}`);
}

// ============================================================
// ADMIN PANEL FUNCTIONS
// ============================================================

// Load all clients with summary
async function adminLoadClients() {
  return SB.select('client_summary', '', 'business_name.asc');
}

// Create new client
async function adminCreateClient(data) {
  return SB.insert('clients', data);
}

// Add view balance top-up
async function adminTopUpViews(clientId, viewsToAdd, amountCAD, reference) {
  // 1. Add transaction record
  await SB.insert('transactions', {
    client_id:       clientId,
    billing_model:   'views',
    views_added:     viewsToAdd,
    amount_cad:      amountCAD,
    price_per_unit:  amountCAD / viewsToAdd,
    payment_reference: reference,
    payment_status:  'confirmed'
  });
  // 2. Update client balance (trigger handles ad deductions, this handles top-up)
  const [client] = await SB.select('clients', `id=eq.${clientId}`);
  if (client) {
    return SB.update('clients', `id=eq.${clientId}`, {
      view_balance: client.view_balance + viewsToAdd
    });
  }
}

// Create lead package (Model B)
async function adminCreateLeadPackage(clientId, campaignId, data) {
  // 1. Create package
  const pkg = await SB.insert('lead_packages', {
    client_id:      clientId,
    campaign_id:    campaignId,
    package_name:   data.name,
    leads_purchased:data.leads,
    price_per_lead: data.pricePerLead,
    total_price:    data.leads * data.pricePerLead,
    amount_paid:    data.amountPaid || 0
  });
  // 2. Record transaction
  if (pkg) {
    await SB.insert('transactions', {
      client_id:       clientId,
      billing_model:   'leads',
      lead_package_id: pkg[0].id,
      leads_purchased: data.leads,
      amount_cad:      data.leads * data.pricePerLead,
      price_per_unit:  data.pricePerLead,
      payment_reference: data.reference,
      payment_status:  'confirmed'
    });
  }
  return pkg;
}

// Mark lead as verified + delivered (Model B)
async function adminDeliverLead(leadId) {
  return SB.update('leads', `id=eq.${leadId}`, {
    verified:  true,
    delivered: true,
    updated_at: new Date().toISOString()
  });
}

// Queue bulk AI calls
async function queueBulkCalls(clientId, leadIds, type = 'call') {
  const items = leadIds.map((leadId, i) => ({
    client_id:     clientId,
    lead_id:       leadId,
    queue_type:    type,
    priority:      5,
    scheduled_for: new Date(Date.now() + i * 3000).toISOString() // 3s apart
  }));
  return SB.insert('ai_call_queue', items);
}

// ============================================================
// REALTIME — live updates in client panel
// Use Supabase Realtime to push new leads without refresh
// ============================================================
function subscribeToLeads(clientId, onNewLead) {
  // This requires the Supabase JS client library
  // Add to HTML: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  if (typeof window.supabase === 'undefined') return;
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client
    .channel('leads-channel')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'leads',
      filter: `client_id=eq.${clientId}`
    }, payload => onNewLead(payload.new))
    .subscribe();
}

console.log('[Adviuz] Database layer loaded ✓');
