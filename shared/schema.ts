import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const leadTypeEnum = pgEnum("lead_type", ["residential", "commercial", "employment"]);
export const leadSourceEnum = pgEnum("lead_source", ["call", "sms", "form", "ad", "referral"]);
export const leadStatusEnum = pgEnum("lead_status", ["new", "contacted", "booked", "active", "completed", "lost"]);
export const callDirectionEnum = pgEnum("call_direction", ["inbound", "outbound"]);
export const callStatusEnum = pgEnum("call_status", ["initiated", "ringing", "in-progress", "completed", "busy", "failed", "no-answer", "canceled"]);
export const hungUpByEnum = pgEnum("hung_up_by", ["caller", "owner"]);
export const eventTypeEnum = pgEnum("event_type", ["initiated", "ringing", "answered", "completed"]);
export const channelEnum = pgEnum("channel", ["sms", "whatsapp", "email"]);
export const messageDirectionEnum = pgEnum("message_direction", ["inbound", "outbound"]);
export const messageStatusEnum = pgEnum("message_status", ["queued", "sent", "delivered", "read", "failed"]);
export const jobStatusEnum = pgEnum("job_status", ["scheduled", "completed", "cancelled"]);
export const serviceTypeEnum = pgEnum("service_type", ["house_cleaning", "deep_clean", "move_out", "move_in", "commercial", "post_construction", "recurring"]);

// Leads table
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  leadType: leadTypeEnum("lead_type").default("residential"),
  source: leadSourceEnum("source").default("call"),
  status: leadStatusEnum("status").default("new"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  notes: text("notes"),
  frequency: text("frequency"),
  homeSize: text("home_size"),
  calculatedPrice: integer("calculated_price"),
  addons: text("addons"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),
  actionTaken: text("action_taken"),
  actionTakenAt: timestamp("action_taken_at"),
  lastSmsAlertAt: timestamp("last_sms_alert_at"),
});

export const leadsRelations = relations(leads, ({ one, many }) => ({
  customer: one(customers, {
    fields: [leads.id],
    references: [customers.leadId],
  }),
  calls: many(calls),
  conversations: many(conversations),
  leadActivities: many(leadActivities),
}));

// Lead Activities table
export const leadActivities = pgTable("lead_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id, { onDelete: "cascade" }).notNull(),
  actionType: text("action_type").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leadActivitiesRelations = relations(leadActivities, ({ one }) => ({
  lead: one(leads, { fields: [leadActivities.leadId], references: [leads.id] }),
}));

// Settings table
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Customers table
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id),
  billingName: text("billing_name"),
  serviceAddress: text("service_address"),
  notes: text("notes"),
  lifetimeValue: integer("lifetime_value").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customersRelations = relations(customers, ({ one, many }) => ({
  lead: one(leads, {
    fields: [customers.leadId],
    references: [leads.id],
  }),
  jobs: many(jobs),
}));

// Calls table (snapshot - latest state per call)
export const calls = pgTable("calls", {
  callSid: varchar("call_sid").primaryKey(),
  leadId: varchar("lead_id").references(() => leads.id),
  fromNumber: text("from_number").notNull(),
  toNumber: text("to_number").notNull(),
  direction: callDirectionEnum("direction").notNull(),
  callStatus: callStatusEnum("call_status").default("initiated"),
  durationSeconds: integer("duration_seconds"),
  hungUpBy: hungUpByEnum("hung_up_by"),
  ivrOption: text("ivr_option"), // digit pressed ("1"-"4"), "timeout" = no input, null = pre-IVR
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

export const callsRelations = relations(calls, ({ one, many }) => ({
  lead: one(leads, {
    fields: [calls.leadId],
    references: [leads.id],
  }),
  events: many(callEvents),
}));

// Call Events table (append-only timeline)
export const callEvents = pgTable("call_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callSid: varchar("call_sid").references(() => calls.callSid).notNull(),
  eventType: eventTypeEnum("event_type").notNull(),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
});

export const callEventsRelations = relations(callEvents, ({ one }) => ({
  call: one(calls, {
    fields: [callEvents.callSid],
    references: [calls.callSid],
  }),
}));

// Conversations table
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id),
  channel: channelEnum("channel").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  lead: one(leads, {
    fields: [conversations.leadId],
    references: [leads.id],
  }),
  messages: many(messages),
}));

// Messages table
export const messages = pgTable("messages", {
  messageSid: varchar("message_sid").primaryKey(),
  conversationId: varchar("conversation_id").references(() => conversations.id),
  direction: messageDirectionEnum("direction").notNull(),
  fromNumber: text("from_number").notNull(),
  toNumber: text("to_number").notNull(),
  body: text("body"),
  status: messageStatusEnum("status").default("queued"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

// Jobs table
export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => customers.id),
  serviceType: serviceTypeEnum("service_type").notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  arrivalWindowStart: text("arrival_window_start"),
  arrivalWindowEnd: text("arrival_window_end"),
  status: jobStatusEnum("status").default("scheduled"),
  notes: text("notes"),
});

export const jobsRelations = relations(jobs, ({ one }) => ({
  customer: one(customers, {
    fields: [jobs.customerId],
    references: [customers.id],
  }),
}));

// Admin role enum
export const adminRoleEnum = pgEnum("admin_role", ["admin", "owner", "dispatcher", "manager"]);

// Admins table - references Supabase auth.users
export const admins = pgTable("admins", {
  adminId: varchar("admin_id").primaryKey(), // References Supabase auth.users(id)
  email: text("email").notNull().unique(),
  role: adminRoleEnum("role").default("admin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export const insertCallSchema = createInsertSchema(calls).omit({
  startedAt: true,
});

export const insertCallEventSchema = createInsertSchema(callEvents).omit({
  id: true,
  occurredAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  sentAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
});

export const insertAdminSchema = createInsertSchema(admins).omit({
  createdAt: true,
});

export const insertLeadActivitySchema = createInsertSchema(leadActivities).omit({ id: true, createdAt: true });
export const insertSettingsSchema = createInsertSchema(settings).omit({ updatedAt: true });

// Types
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;
export type CallEvent = typeof callEvents.$inferSelect;
export type InsertCallEvent = z.infer<typeof insertCallEventSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type LeadActivity = typeof leadActivities.$inferSelect;
export type InsertLeadActivity = z.infer<typeof insertLeadActivitySchema>;
export type Setting = typeof settings.$inferSelect;

// Extended types with relations
export type LeadWithCustomer = Lead & { customer?: Customer | null };
export type CustomerWithLead = Customer & { lead?: Lead | null };
export type CallWithLead = Call & { lead?: Lead | null };
export type ConversationWithMessages = Conversation & { messages: Message[]; lead?: Lead | null };
export type JobWithCustomer = Job & { customer?: CustomerWithLead | null };
