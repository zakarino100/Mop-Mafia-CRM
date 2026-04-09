import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeadSchema, insertCustomerSchema, insertJobSchema, admins } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdminAuth, createAuthRouter } from "./auth";
import { validateTwilioWebhook } from "./webhookAuth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Auth routes (public)
  app.use("/auth", createAuthRouter());

  // Stats endpoint (protected)
  app.get("/api/stats", requireAdminAuth, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // ==================== LEADS (protected) ====================
  app.get("/api/leads", requireAdminAuth, async (req, res) => {
    try {
      const leads = await storage.getLeads();
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", requireAdminAuth, async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ error: "Failed to fetch lead" });
    }
  });

  app.post("/api/leads", requireAdminAuth, async (req, res) => {
    try {
      const data = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(data);
      res.status(201).json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating lead:", error);
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  app.patch("/api/leads/:id", requireAdminAuth, async (req, res) => {
    try {
      const data = insertLeadSchema.partial().parse(req.body);
      const lead = await storage.updateLead(req.params.id, data);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating lead:", error);
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  app.delete("/api/leads/:id", requireAdminAuth, async (req, res) => {
    try {
      await storage.deleteLead(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });

  // ==================== CUSTOMERS ====================
  app.get("/api/customers", requireAdminAuth, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", requireAdminAuth, async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", requireAdminAuth, async (req, res) => {
    try {
      const data = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(data);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating customer:", error);
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  app.patch("/api/customers/:id", requireAdminAuth, async (req, res) => {
    try {
      const data = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, data);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating customer:", error);
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", requireAdminAuth, async (req, res) => {
    try {
      await storage.deleteCustomer(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  // ==================== CALLS ====================
  app.get("/api/calls", requireAdminAuth, async (req, res) => {
    try {
      const calls = await storage.getCalls();
      res.json(calls);
    } catch (error) {
      console.error("Error fetching calls:", error);
      res.status(500).json({ error: "Failed to fetch calls" });
    }
  });

  app.get("/api/calls/:callSid", requireAdminAuth, async (req, res) => {
    try {
      const call = await storage.getCall(req.params.callSid);
      if (!call) {
        return res.status(404).json({ error: "Call not found" });
      }
      res.json(call);
    } catch (error) {
      console.error("Error fetching call:", error);
      res.status(500).json({ error: "Failed to fetch call" });
    }
  });

  app.get("/api/calls/:callSid/events", requireAdminAuth, async (req, res) => {
    try {
      const events = await storage.getCallEvents(req.params.callSid);
      res.json(events);
    } catch (error) {
      console.error("Error fetching call events:", error);
      res.status(500).json({ error: "Failed to fetch call events" });
    }
  });

  // ==================== CONVERSATIONS & MESSAGES ====================
  app.get("/api/conversations", requireAdminAuth, async (req, res) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", requireAdminAuth, async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.get("/api/conversations/:id/messages", requireAdminAuth, async (req, res) => {
    try {
      const messages = await storage.getMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // ==================== JOBS ====================
  app.get("/api/jobs", requireAdminAuth, async (req, res) => {
    try {
      const jobs = await storage.getJobs();
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/:id", requireAdminAuth, async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(500).json({ error: "Failed to fetch job" });
    }
  });

  app.post("/api/jobs", requireAdminAuth, async (req, res) => {
    try {
      const data = insertJobSchema.parse({
        ...req.body,
        scheduledDate: new Date(req.body.scheduledDate),
      });
      const job = await storage.createJob(data);
      res.status(201).json(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating job:", error);
      res.status(500).json({ error: "Failed to create job" });
    }
  });

  app.patch("/api/jobs/:id", requireAdminAuth, async (req, res) => {
    try {
      const data = insertJobSchema.partial().parse({
        ...req.body,
        scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : undefined,
      });
      const job = await storage.updateJob(req.params.id, data);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating job:", error);
      res.status(500).json({ error: "Failed to update job" });
    }
  });

  app.delete("/api/jobs/:id", requireAdminAuth, async (req, res) => {
    try {
      await storage.deleteJob(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting job:", error);
      res.status(500).json({ error: "Failed to delete job" });
    }
  });

  // ==================== DEBUG ENDPOINTS (temporary) ====================
  
  // One-time admin setup for production - authenticates with Supabase and creates/updates admin
  app.post("/debug/setup-admin", async (req, res) => {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        return res.json({ success: false, error: "Supabase not configured" });
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Sign in to get the real Supabase user ID
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "nicole@mop-mafia.com",
        password: "mopmafia25!",
      });
      
      if (error || !data.user) {
        return res.json({ success: false, error: error?.message || "Auth failed" });
      }
      
      const supabaseUserId = data.user.id;
      const email = data.user.email!;
      
      // Check if admin already exists with correct ID
      const existing = await storage.getAdminByEmail(email);
      if (existing && existing.adminId === supabaseUserId) {
        return res.json({ success: true, message: "Admin already configured correctly", admin: existing });
      }
      
      // Delete old admin record if exists with wrong ID
      if (existing) {
        await db.delete(admins).where(eq(admins.email, email));
      }
      
      // Create admin with correct Supabase user ID
      const admin = await storage.createAdmin({
        email,
        adminId: supabaseUserId,
      });
      
      res.json({ success: true, admin, supabaseUserId });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // List all calls (debug)
  app.get("/debug/calls", async (req, res) => {
    try {
      const calls = await storage.getCalls();
      const leads = await storage.getLeads();
      res.json({ callCount: calls.length, calls: calls.slice(0, 10), leadCount: leads.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/debug/db-info", async (req, res) => {
    const dbUrl = process.env.DATABASE_URL || "";
    // Extract host only (no credentials)
    const match = dbUrl.match(/@([^:\/]+)/);
    const host = match ? match[1] : "unknown";
    res.json({ dbHost: host, nodeEnv: process.env.NODE_ENV });
  });

  app.get("/debug/db-test", async (req, res) => {
    try {
      const testLead = await storage.createLead({
        phone: "+1555" + Date.now().toString().slice(-7),
        source: "form",
        status: "new",
        leadType: "residential",
      });
      res.json({ success: true, createdLead: testLead });
    } catch (error: any) {
      console.error("Debug DB test error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Debug endpoint that simulates webhook processing
  app.post("/debug/test-call", async (req, res) => {
    const steps: string[] = [];
    try {
      steps.push("1. Received request");
      const { CallSid, From, To, Direction, CallStatus, CallDuration } = req.body;
      steps.push(`2. Parsed: CallSid=${CallSid}, From=${From}, To=${To}`);
      
      if (!CallSid) {
        return res.json({ success: false, error: "No CallSid", steps });
      }

      const fromNumber = From?.replace(/\s+/g, "") || "";
      const toNumber = To?.replace(/\s+/g, "") || "";
      const direction = (Direction?.toLowerCase() || "inbound") as "inbound" | "outbound";
      const callStatus = CallStatus?.toLowerCase() || "initiated";
      steps.push(`3. Normalized: from=${fromNumber}, direction=${direction}, status=${callStatus}`);

      // Find or create lead
      let lead = await storage.getLeadByPhone(fromNumber);
      steps.push(`4. Lead lookup result: ${lead ? lead.id : "not found"}`);
      
      if (!lead) {
        lead = await storage.createLead({
          phone: fromNumber,
          source: "call",
          status: "new",
          leadType: "residential",
        });
        steps.push(`5. Created lead: ${lead.id}`);
      }

      // Create or update call
      const existingCall = await storage.getCall(CallSid);
      steps.push(`6. Existing call: ${existingCall ? "yes" : "no"}`);

      const callData = {
        callSid: CallSid,
        leadId: lead.id,
        fromNumber,
        toNumber,
        direction,
        callStatus,
        durationSeconds: parseInt(CallDuration) || null,
      };

      let call;
      if (existingCall) {
        call = await storage.updateCall(CallSid, callData);
        steps.push("7. Updated call");
      } else {
        call = await storage.createCall(callData);
        steps.push("7. Created call");
      }

      res.json({ success: true, steps, lead, call });
    } catch (error: any) {
      steps.push(`ERROR: ${error.message}`);
      res.json({ success: false, error: error.message, steps });
    }
  });

  // ==================== TWILIO WEBHOOKS (public, with secret validation) ====================

  // ---- IVR constants ----
  const OWNER_NUMBER = "+13159357169";
  const MOP_MAFIA_NUMBER = "+19844646019";
  const IVR_AUDIO_URL = "https://mop-mafia-ivr-audio.s3.us-east-2.amazonaws.com/mopmafiaivr.mp3";

  // Map IVR digit presses to human-readable intent for the whisper
  const DIGIT_INTENT: Record<string, string> = {
    "1": "requesting a quote",
    "2": "an existing customer",
    "3": "inquiring about commercial or office cleaning",
    "4": "looking for employment",
    "0": "no menu selection — forwarded directly",
  };

  function getBaseUrl(req: any): string {
    const proto = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    return `${proto}://${host}`;
  }

  // Step 1: Play IVR audio and collect a digit press
  app.post("/webhooks/twilio/voice", validateTwilioWebhook, (req, res) => {
    const base = getBaseUrl(req);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="${base}/webhooks/twilio/voice/gather" method="POST" timeout="10">
    <Play>${IVR_AUDIO_URL}</Play>
  </Gather>
  <Redirect method="POST">${base}/webhooks/twilio/voice/gather</Redirect>
</Response>`;
    res.set("Content-Type", "text/xml");
    res.send(twiml);
  });

  // Step 2: Receive the digit (or timeout), log IVR option, forward call to owner
  app.post("/webhooks/twilio/voice/gather", validateTwilioWebhook, async (req, res) => {
    const base = getBaseUrl(req);
    const { CallSid, Digits } = req.body;

    // Distinguish: no digit pressed (timeout/redirect) vs digit pressed
    const digit = Digits || "0";
    const ivrOption = !Digits ? "timeout" : Digits; // "timeout" = no input, else the digit

    // Option 9: replay the menu — don't log as a real selection
    if (digit === "9") {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect method="POST">${base}/webhooks/twilio/voice</Redirect>
</Response>`;
      res.set("Content-Type", "text/xml");
      return res.send(twiml);
    }

    // Log the IVR option on the call record (non-blocking)
    if (CallSid) {
      storage.updateCall(CallSid, { ivrOption }).catch((err) =>
        console.error("Failed to log ivrOption:", err)
      );
    }

    // All other options: forward to owner with whisper
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${MOP_MAFIA_NUMBER}" action="${base}/webhooks/twilio/voice/dial-complete" method="POST">
    <Number url="${base}/webhooks/twilio/voice/whisper?digit=${encodeURIComponent(digit)}" method="POST">${OWNER_NUMBER}</Number>
  </Dial>
</Response>`;
    res.set("Content-Type", "text/xml");
    res.send(twiml);
  });

  // Step 4: Dial complete — update call record with real outcome (no-answer, busy, etc.)
  app.post("/webhooks/twilio/voice/dial-complete", validateTwilioWebhook, async (req, res) => {
    const { CallSid, DialCallStatus, DialCallDuration } = req.body;
    const terminalStatusMap: Record<string, "completed" | "busy" | "failed" | "no-answer" | "canceled"> = {
      "completed": "completed",
      "busy":      "busy",
      "failed":    "failed",
      "no-answer": "no-answer",
      "canceled":  "canceled",
    };
    const mappedStatus = terminalStatusMap[DialCallStatus?.toLowerCase()];
    if (CallSid && mappedStatus) {
      try {
        await storage.updateCall(CallSid, {
          callStatus: mappedStatus,
          durationSeconds: DialCallDuration ? parseInt(DialCallDuration, 10) : undefined,
          endedAt: new Date(),
          // If dial-complete fires with "completed", owner hung up (caller hanging up skips the action URL)
          hungUpBy: mappedStatus === "completed" ? "owner" : undefined,
        });
        console.log(`dial-complete: updated ${CallSid} → ${mappedStatus}, hungUpBy: ${mappedStatus === "completed" ? "owner" : "n/a"}`);
      } catch (err) {
        console.error("dial-complete: failed to update call", err);
      }
    }
    // Return empty TwiML — caller leg ends gracefully
    res.set("Content-Type", "text/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
  });

  // Step 3: Whisper to the owner before connecting — announces call intent
  app.post("/webhooks/twilio/voice/whisper", (req, res) => {
    const digit = (req.query.digit as string) || "0";
    const intent = DIGIT_INTENT[digit] || `option ${digit}`;
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Mop Mafia call. The caller is ${intent}. Connecting now.</Say>
</Response>`;
    res.set("Content-Type", "text/xml");
    res.send(twiml);
  });

  // Twilio Call Status Webhook
  app.post("/webhooks/twilio/call-status", validateTwilioWebhook, async (req, res) => {
    console.log("Call webhook received body:", JSON.stringify(req.body));
    try {
      const {
        CallSid,
        From,
        To,
        Direction,
        CallStatus,
        CallDuration,
        Timestamp,
      } = req.body;

      console.log("Parsed call data:", { CallSid, From, To, Direction, CallStatus, CallDuration });

      if (!CallSid || !From || !To) {
        console.log("Missing required fields - CallSid:", CallSid, "From:", From, "To:", To);
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Normalize phone number (remove leading +1 for matching)
      const normalizedPhone = Direction === "inbound" ? From : To;
      
      // Resolve or create lead by phone
      let lead = await storage.getLeadByPhone(normalizedPhone);
      if (!lead) {
        console.log("Creating new lead for phone:", normalizedPhone);
        lead = await storage.createLead({
          phone: normalizedPhone,
          source: "call",
          status: "new",
          leadType: "residential",
        });
        console.log("Created lead:", lead.id);
      } else {
        console.log("Found existing lead:", lead.id);
      }

      // Check if call exists
      const existingCall = await storage.getCall(CallSid);
      console.log("Existing call lookup result:", existingCall ? existingCall.callSid : "not found");
      
      // Map Twilio status to our enum
      const statusMap: Record<string, "initiated" | "ringing" | "in-progress" | "completed" | "busy" | "failed" | "no-answer" | "canceled"> = {
        "queued": "initiated",
        "initiated": "initiated",
        "ringing": "ringing",
        "in-progress": "in-progress",
        "completed": "completed",
        "busy": "busy",
        "failed": "failed",
        "no-answer": "no-answer",
        "canceled": "canceled",
      };
      
      const mappedStatus = statusMap[CallStatus?.toLowerCase()] || "initiated";

      // Terminal statuses set by dial-complete that should NOT be overwritten by a generic "completed"
      const specificTerminalStatuses = new Set(["no-answer", "busy", "failed", "canceled"]);

      if (existingCall) {
        // Update existing call snapshot, but don't overwrite a specific terminal status with "completed"
        const alreadySpecific = specificTerminalStatuses.has(existingCall.callStatus ?? "");
        if (alreadySpecific && mappedStatus === "completed") {
          console.log(`Skipping status overwrite: call ${CallSid} already has specific status ${existingCall.callStatus}`);
        } else {
          const isTerminal = ["completed", "no-answer", "busy", "failed", "canceled"].includes(mappedStatus);
          // If completing and hungUpBy is not already set (dial-complete didn't fire) → caller hung up
          const hungUpBy = (mappedStatus === "completed" && !existingCall.hungUpBy) ? "caller" : undefined;
          console.log("Updating existing call:", CallSid);
          await storage.updateCall(CallSid, {
            callStatus: mappedStatus,
            durationSeconds: CallDuration ? parseInt(CallDuration, 10) : undefined,
            endedAt: isTerminal ? new Date() : undefined,
            ...(hungUpBy ? { hungUpBy } : {}),
          });
          console.log("Call updated successfully", hungUpBy ? `hungUpBy: ${hungUpBy}` : "");
        }
      } else {
        // Create new call
        console.log("Creating new call:", CallSid);
        const newCall = await storage.createCall({
          callSid: CallSid,
          leadId: lead.id,
          fromNumber: From,
          toNumber: To,
          direction: Direction?.toLowerCase() === "outbound-api" || Direction?.toLowerCase() === "outbound-dial" 
            ? "outbound" 
            : "inbound",
          callStatus: mappedStatus,
          durationSeconds: CallDuration ? parseInt(CallDuration, 10) : undefined,
        });
        console.log("Call created successfully:", newCall.callSid);
      }

      // Always append call event (append-only timeline)
      const eventTypeMap: Record<string, "initiated" | "ringing" | "answered" | "completed"> = {
        "queued": "initiated",
        "initiated": "initiated",
        "ringing": "ringing",
        "in-progress": "answered",
        "completed": "completed",
      };
      
      const eventType = eventTypeMap[CallStatus?.toLowerCase()];
      if (eventType) {
        await storage.createCallEvent({
          callSid: CallSid,
          eventType,
        });
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("Error processing Twilio call webhook:", error);
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  // Twilio Message Webhook
  app.post("/webhooks/twilio/message", validateTwilioWebhook, async (req, res) => {
    try {
      const {
        MessageSid,
        From,
        To,
        Body,
        MessageStatus,
        SmsStatus,
      } = req.body;

      if (!MessageSid || !From || !To) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Determine direction based on number format
      const isInbound = !From.includes("twilio") && From.startsWith("+");
      const direction = isInbound ? "inbound" : "outbound";
      const customerPhone = isInbound ? From : To;

      // Resolve or create lead by phone
      let lead = await storage.getLeadByPhone(customerPhone);
      if (!lead) {
        lead = await storage.createLead({
          phone: customerPhone,
          source: "sms",
          status: "new",
          leadType: "residential",
        });
      }

      // Find or create conversation
      let conversation = await storage.getConversationByLeadAndChannel(lead.id, "sms");
      if (!conversation) {
        conversation = await storage.createConversation({
          leadId: lead.id,
          channel: "sms",
        });
      }

      // Map status
      const statusMap: Record<string, "queued" | "sent" | "delivered" | "read" | "failed"> = {
        "queued": "queued",
        "sending": "queued",
        "sent": "sent",
        "delivered": "delivered",
        "read": "read",
        "failed": "failed",
        "undelivered": "failed",
      };
      
      const status = statusMap[(MessageStatus || SmsStatus || "queued").toLowerCase()] || "queued";

      // Create message
      await storage.createMessage({
        messageSid: MessageSid,
        conversationId: conversation.id,
        direction,
        fromNumber: From,
        toNumber: To,
        body: Body || "",
        status,
      });

      res.status(200).send("OK");
    } catch (error) {
      console.error("Error processing Twilio message webhook:", error);
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  // ==================== LANDING PAGE WEBHOOK (public, with secret validation) ====================
  
  const landingPageLeadSchema = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().min(1, "Phone number is required"),
    email: z.string().email().optional().or(z.literal("")),
    message: z.string().optional(),
    leadType: z.enum(["residential", "commercial", "employment"]).optional(),
    source: z.string().optional(),
  });

  app.post("/webhooks/landing-page/lead", async (req, res) => {
    console.log("Landing page webhook received:", JSON.stringify(req.body));
    
    // Validate webhook secret
    const LANDING_PAGE_SECRET = process.env.LANDING_PAGE_WEBHOOK_SECRET;
    const providedSecret = req.headers["x-webhook-secret"] as string;
    
    if (LANDING_PAGE_SECRET && providedSecret !== LANDING_PAGE_SECRET) {
      console.warn("Landing page webhook - invalid secret");
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const data = landingPageLeadSchema.parse(req.body);
      
      // Check if lead already exists by phone
      let lead = await storage.getLeadByPhone(data.phone);
      
      if (lead) {
        // Update existing lead with new info
        console.log("Updating existing lead:", lead.id);
        lead = await storage.updateLead(lead.id, {
          firstName: data.firstName || lead.firstName,
          lastName: data.lastName || lead.lastName,
          email: data.email || lead.email,
          leadType: data.leadType || lead.leadType,
          // Add message to notes if provided
          ...(data.message && { notes: data.message }),
        });
      } else {
        // Create new lead
        console.log("Creating new lead from landing page");
        lead = await storage.createLead({
          phone: data.phone,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email || undefined,
          leadType: data.leadType || "residential",
          source: (data.source as any) || "form",
          status: "new",
        });
      }
      
      console.log("Lead processed:", lead?.id);
      res.status(200).json({ 
        success: true, 
        leadId: lead?.id,
        message: "Lead received successfully" 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Landing page webhook validation error:", error.errors);
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error processing landing page webhook:", error);
      res.status(500).json({ error: "Failed to process lead" });
    }
  });

  return httpServer;
}
