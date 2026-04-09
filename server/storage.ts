import {
  leads, customers, calls, callEvents, conversations, messages, jobs, admins,
  type Lead, type InsertLead,
  type Customer, type InsertCustomer,
  type Call, type InsertCall,
  type CallEvent, type InsertCallEvent,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
  type Job, type InsertJob,
  type Admin, type InsertAdmin,
  type LeadWithCustomer, type CustomerWithLead, type CallWithLead, 
  type ConversationWithMessages, type JobWithCustomer,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // Leads
  getLeads(): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  getLeadByPhone(phone: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;

  // Customers
  getCustomers(): Promise<CustomerWithLead[]>;
  getCustomer(id: string): Promise<CustomerWithLead | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;

  // Calls
  getCalls(): Promise<CallWithLead[]>;
  getCall(callSid: string): Promise<Call | undefined>;
  createCall(call: InsertCall): Promise<Call>;
  updateCall(callSid: string, call: Partial<InsertCall>): Promise<Call | undefined>;

  // Call Events
  getCallEvents(callSid: string): Promise<CallEvent[]>;
  createCallEvent(event: InsertCallEvent): Promise<CallEvent>;

  // Conversations
  getConversations(): Promise<ConversationWithMessages[]>;
  getConversation(id: string): Promise<ConversationWithMessages | undefined>;
  getConversationByLeadAndChannel(leadId: string, channel: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;

  // Messages
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(messageSid: string, message: Partial<InsertMessage>): Promise<Message | undefined>;

  // Jobs
  getJobs(): Promise<JobWithCustomer[]>;
  getJob(id: string): Promise<JobWithCustomer | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: string, job: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: string): Promise<boolean>;

  // Stats
  getStats(): Promise<{
    totalLeads: number;
    newLeads: number;
    totalCustomers: number;
    totalCalls: number;
    totalJobs: number;
    scheduledJobs: number;
  }>;

  // Admins
  getAdmin(adminId: string): Promise<Admin | undefined>;
  getAdminByEmail(email: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  deleteAdmin(adminId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Leads
  async getLeads(): Promise<Lead[]> {
    return db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async getLeadByPhone(phone: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.phone, phone));
    return lead;
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [newLead] = await db.insert(leads).values(lead).returning();
    return newLead;
  }

  async updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined> {
    const [updated] = await db
      .update(leads)
      .set({ ...lead, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return updated;
  }

  async deleteLead(id: string): Promise<boolean> {
    const result = await db.delete(leads).where(eq(leads.id, id));
    return true;
  }

  // Customers
  async getCustomers(): Promise<CustomerWithLead[]> {
    const results = await db
      .select()
      .from(customers)
      .leftJoin(leads, eq(customers.leadId, leads.id))
      .orderBy(desc(customers.createdAt));
    
    return results.map(r => ({
      ...r.customers,
      lead: r.leads || undefined,
    }));
  }

  async getCustomer(id: string): Promise<CustomerWithLead | undefined> {
    const [result] = await db
      .select()
      .from(customers)
      .leftJoin(leads, eq(customers.leadId, leads.id))
      .where(eq(customers.id, id));
    
    if (!result) return undefined;
    return {
      ...result.customers,
      lead: result.leads || undefined,
    };
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    
    // Update lead status to active when promoted to customer
    if (customer.leadId) {
      await db.update(leads).set({ status: "active" }).where(eq(leads.id, customer.leadId));
    }
    
    return newCustomer;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updated] = await db
      .update(customers)
      .set(customer)
      .where(eq(customers.id, id))
      .returning();
    return updated;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    await db.delete(customers).where(eq(customers.id, id));
    return true;
  }

  // Calls
  async getCalls(): Promise<CallWithLead[]> {
    const results = await db
      .select()
      .from(calls)
      .leftJoin(leads, eq(calls.leadId, leads.id))
      .orderBy(desc(calls.startedAt));
    
    return results.map(r => ({
      ...r.calls,
      lead: r.leads || undefined,
    }));
  }

  async getCall(callSid: string): Promise<Call | undefined> {
    const [call] = await db.select().from(calls).where(eq(calls.callSid, callSid));
    return call;
  }

  async createCall(call: InsertCall): Promise<Call> {
    const [newCall] = await db.insert(calls).values(call).returning();
    return newCall;
  }

  async updateCall(callSid: string, call: Partial<InsertCall>): Promise<Call | undefined> {
    const [updated] = await db
      .update(calls)
      .set(call)
      .where(eq(calls.callSid, callSid))
      .returning();
    return updated;
  }

  // Call Events
  async getCallEvents(callSid: string): Promise<CallEvent[]> {
    return db
      .select()
      .from(callEvents)
      .where(eq(callEvents.callSid, callSid))
      .orderBy(callEvents.occurredAt);
  }

  async createCallEvent(event: InsertCallEvent): Promise<CallEvent> {
    const [newEvent] = await db.insert(callEvents).values(event).returning();
    return newEvent;
  }

  // Conversations
  async getConversations(): Promise<ConversationWithMessages[]> {
    const convs = await db
      .select()
      .from(conversations)
      .leftJoin(leads, eq(conversations.leadId, leads.id))
      .orderBy(desc(conversations.createdAt));
    
    const result: ConversationWithMessages[] = [];
    
    for (const conv of convs) {
      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv.conversations.id))
        .orderBy(messages.sentAt);
      
      result.push({
        ...conv.conversations,
        lead: conv.leads || undefined,
        messages: msgs,
      });
    }
    
    return result;
  }

  async getConversation(id: string): Promise<ConversationWithMessages | undefined> {
    const [conv] = await db
      .select()
      .from(conversations)
      .leftJoin(leads, eq(conversations.leadId, leads.id))
      .where(eq(conversations.id, id));
    
    if (!conv) return undefined;
    
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.sentAt);
    
    return {
      ...conv.conversations,
      lead: conv.leads || undefined,
      messages: msgs,
    };
  }

  async getConversationByLeadAndChannel(leadId: string, channel: string): Promise<Conversation | undefined> {
    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.leadId, leadId),
        eq(conversations.channel, channel as "sms" | "whatsapp" | "email")
      ));
    return conv;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db.insert(conversations).values(conversation).returning();
    return newConversation;
  }

  // Messages
  async getMessages(conversationId: string): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.sentAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async updateMessage(messageSid: string, message: Partial<InsertMessage>): Promise<Message | undefined> {
    const [updated] = await db
      .update(messages)
      .set(message)
      .where(eq(messages.messageSid, messageSid))
      .returning();
    return updated;
  }

  // Jobs
  async getJobs(): Promise<JobWithCustomer[]> {
    const results = await db
      .select()
      .from(jobs)
      .leftJoin(customers, eq(jobs.customerId, customers.id))
      .leftJoin(leads, eq(customers.leadId, leads.id))
      .orderBy(desc(jobs.scheduledDate));
    
    return results.map(r => ({
      ...r.jobs,
      customer: r.customers ? {
        ...r.customers,
        lead: r.leads || undefined,
      } : undefined,
    }));
  }

  async getJob(id: string): Promise<JobWithCustomer | undefined> {
    const [result] = await db
      .select()
      .from(jobs)
      .leftJoin(customers, eq(jobs.customerId, customers.id))
      .leftJoin(leads, eq(customers.leadId, leads.id))
      .where(eq(jobs.id, id));
    
    if (!result) return undefined;
    return {
      ...result.jobs,
      customer: result.customers ? {
        ...result.customers,
        lead: result.leads || undefined,
      } : undefined,
    };
  }

  async createJob(job: InsertJob): Promise<Job> {
    const [newJob] = await db.insert(jobs).values(job).returning();
    return newJob;
  }

  async updateJob(id: string, job: Partial<InsertJob>): Promise<Job | undefined> {
    const [updated] = await db
      .update(jobs)
      .set(job)
      .where(eq(jobs.id, id))
      .returning();
    return updated;
  }

  async deleteJob(id: string): Promise<boolean> {
    await db.delete(jobs).where(eq(jobs.id, id));
    return true;
  }

  // Stats
  async getStats() {
    const [leadStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        new: sql<number>`count(*) filter (where ${leads.status} = 'new')::int`,
      })
      .from(leads);

    const [customerStats] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(customers);

    const [callStats] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(calls);

    const [jobStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        scheduled: sql<number>`count(*) filter (where ${jobs.status} = 'scheduled')::int`,
      })
      .from(jobs);

    return {
      totalLeads: leadStats?.total || 0,
      newLeads: leadStats?.new || 0,
      totalCustomers: customerStats?.total || 0,
      totalCalls: callStats?.total || 0,
      totalJobs: jobStats?.total || 0,
      scheduledJobs: jobStats?.scheduled || 0,
    };
  }

  // Admins
  async getAdmin(adminId: string): Promise<Admin | undefined> {
    const [admin] = await db
      .select()
      .from(admins)
      .where(eq(admins.adminId, adminId))
      .limit(1);
    return admin;
  }

  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    const [admin] = await db
      .select()
      .from(admins)
      .where(eq(admins.email, email))
      .limit(1);
    return admin;
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const [newAdmin] = await db.insert(admins).values(admin).returning();
    return newAdmin;
  }

  async deleteAdmin(adminId: string): Promise<boolean> {
    await db.delete(admins).where(eq(admins.adminId, adminId));
    return true;
  }
}

export const storage = new DatabaseStorage();
