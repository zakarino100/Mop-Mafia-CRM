# Mop Mafia CRM

A full-stack CRM for Mop Mafia (mop-mafia.com), a family-owned residential and commercial cleaning company serving Raleigh and the Triangle area.

## Overview

This CRM is the system of record for all customer and lead interactions, designed to replace spreadsheets and serve as the backend for future AI automation including Twilio integration for calls and SMS.

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, shadcn/ui, TanStack Query
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter

## Data Model

### Entities

1. **Leads** - People or businesses (auto-created from inbound calls/messages)
   - Fields: id, firstName, lastName, phone (unique), email, leadType, source, status, timestamps
   - Status: new, contacted, booked, active, completed, lost
   - Type: residential, commercial, employment
   - Source: call, sms, form, ad, referral

2. **Customers** - Promoted leads who have booked service
   - Fields: id, leadId (FK), billingName, serviceAddress, notes, lifetimeValue, createdAt

3. **Calls** - Snapshot table (latest state per call, from Twilio)
   - Fields: callSid (PK), leadId, fromNumber, toNumber, direction, callStatus, durationSeconds, timestamps

4. **Call Events** - Append-only timeline of call lifecycle
   - Fields: id, callSid (FK), eventType, occurredAt

5. **Conversations** - One per lead per channel
   - Fields: id, leadId (FK), channel (sms/whatsapp/email), createdAt

6. **Messages** - All inbound/outbound messages
   - Fields: messageSid (PK), conversationId (FK), direction, fromNumber, toNumber, body, status, sentAt

7. **Jobs** - Scheduled cleanings
   - Fields: id, customerId (FK), serviceType, scheduledDate, arrivalWindowStart/End, status, notes
   - Status: scheduled, completed, cancelled
   - Types: house_cleaning, deep_clean, move_out, move_in, commercial, post_construction, recurring

## API Endpoints

### CRUD Operations
- `/api/leads` - GET, POST, PATCH, DELETE
- `/api/customers` - GET, POST, PATCH, DELETE  
- `/api/calls` - GET (read-only, populated via webhooks)
- `/api/conversations` - GET
- `/api/jobs` - GET, POST, PATCH, DELETE
- `/api/stats` - GET (dashboard statistics)

### Twilio Webhooks
- `POST /webhooks/twilio/call-status` - Receives call status updates, auto-creates leads, logs events
- `POST /webhooks/twilio/message` - Receives SMS messages, auto-creates leads and conversations

## Business Logic

- Phone number is the primary identifier for leads
- Multiple calls/messages map to the same lead via phone lookup
- Calls table reflects the latest state (snapshot pattern)
- Call Events are append-only (never mutated)
- Leads can be promoted to customers
- Jobs belong to customers, not leads

## Project Structure

```
client/src/
├── components/
│   ├── ui/           # shadcn components
│   ├── app-sidebar.tsx
│   ├── data-table.tsx
│   ├── page-header.tsx
│   ├── stat-card.tsx
│   ├── status-badge.tsx
│   └── theme-toggle.tsx
├── pages/
│   ├── dashboard.tsx
│   ├── leads.tsx
│   ├── customers.tsx
│   ├── calls.tsx
│   ├── messages.tsx
│   └── jobs.tsx
└── App.tsx

server/
├── db.ts           # Database connection
├── storage.ts      # Data access layer
├── routes.ts       # API endpoints
└── index.ts        # Express setup

shared/
└── schema.ts       # Drizzle schema + types
```

## Running the Application

```bash
npm run dev          # Start development server
npm run db:push      # Push schema changes to database
```

## Authentication

The CRM uses Supabase Auth for admin authentication:

- **Supabase Auth**: Email/password login via Supabase
- **JWT Authentication**: All API requests require Bearer token
- **Admin-only access**: Users must exist in the `admins` table
- **Protected routes**: All `/api/*` endpoints require authentication
- **Twilio webhooks**: `/webhooks/twilio/*` use shared secret validation instead

### Auth Endpoints
- `POST /auth/login` - Admin login
- `POST /auth/logout` - Admin logout
- `GET /auth/me` - Get current admin
- `POST /auth/refresh` - Refresh JWT token

### Required Secrets
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `TWILIO_WEBHOOK_SECRET` - Shared secret for webhook validation

## Future Enhancements (Not Yet Implemented)

- AI call summaries
- Missed-call SMS follow-ups
- Calendar/route optimization
- Multi-location expansion
