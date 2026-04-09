import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Plus, Search, Phone, Mail, MessageSquare,
  ChevronRight, Clock, CheckCircle2, XCircle,
  PhoneCall, Eye, MousePointerClick,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow, format } from "date-fns";
import type { Lead, LeadActivity } from "@shared/schema";

const createLeadSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().min(10, "Phone number is required"),
  email: z.string().email().optional().or(z.literal("")),
  leadType: z.enum(["residential", "commercial", "employment"]).default("residential"),
  source: z.enum(["call", "sms", "form", "ad", "referral"]).default("form"),
  status: z.enum(["new", "contacted", "booked", "active", "completed", "lost"]).default("new"),
});

type CreateLeadForm = z.infer<typeof createLeadSchema>;

const ACTIVITY_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  lead_created:            { label: "Submitted form",          icon: CheckCircle2,      color: "text-green-500" },
  price_revealed:          { label: "Viewed quote price",      icon: Eye,               color: "text-blue-500" },
  cta_click_book_now:      { label: "Clicked Book Now",        icon: MousePointerClick, color: "text-green-600" },
  cta_click_call_to_book:  { label: "Tapped Call to Book",     icon: Phone,             color: "text-blue-600" },
  call_initiated:          { label: "Call initiated from CRM", icon: PhoneCall,         color: "text-purple-500" },
  note_added:              { label: "Note added",              icon: Clock,             color: "text-muted-foreground" },
};

function getActivityMeta(activity: LeadActivity) {
  const info = ACTIVITY_LABELS[activity.actionType] || {
    label: activity.actionType.replace(/_/g, " "),
    icon: Clock,
    color: "text-muted-foreground",
  };
  let extra = "";
  if (activity.metadata) {
    try {
      const m = JSON.parse(activity.metadata);
      if (m.calculated_price) extra = ` — $${m.calculated_price}`;
    } catch {}
  }
  return { ...info, extra };
}

function ActionTakenBadge({ action }: { action?: string | null }) {
  if (!action) return <Badge variant="secondary" className="text-xs">No action taken</Badge>;
  if (action === "cta_click_book_now") return <Badge className="bg-green-600 hover:bg-green-600 text-xs">Clicked Book Now</Badge>;
  if (action === "cta_click_call_to_book") return <Badge className="bg-blue-600 hover:bg-blue-600 text-xs">Tapped Call</Badge>;
  return <Badge variant="outline" className="text-xs">{action}</Badge>;
}

function LeadDetail({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [notes, setNotes] = useState(lead.notes || "");
  const [notesSaved, setNotesSaved] = useState(false);

  const { data: activities, isLoading: activitiesLoading } = useQuery<LeadActivity[]>({
    queryKey: [`/api/leads/${lead.id}/activities`],
  });

  const updateLead = useMutation({
    mutationFn: async (data: Partial<Lead>) => apiRequest("PATCH", `/api/leads/${lead.id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/leads"] }),
  });

  const saveNotes = useMutation({
    mutationFn: async () => apiRequest("PATCH", `/api/leads/${lead.id}`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    },
  });

  const initiateCall = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/calls/initiate", { leadId: lead.id }),
    onSuccess: () => toast({ title: "📞 Connecting call to your phone..." }),
    onError: () => toast({ title: "Failed to initiate call", variant: "destructive" }),
  });

  const addons = (() => {
    if (!lead.addons) return [];
    try { return JSON.parse(lead.addons); } catch { return []; }
  })();

  const displayName = lead.firstName || lead.lastName
    ? `${lead.firstName || ""} ${lead.lastName || ""}`.trim()
    : "Unknown";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{displayName}</h2>
            <p className="text-sm text-muted-foreground font-mono">{lead.phone}</p>
          </div>
          <StatusBadge status={lead.status || "new"} type="lead" />
        </div>
        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            variant="default"
            className="gap-1.5"
            onClick={() => initiateCall.mutate()}
            disabled={initiateCall.isPending}
          >
            <Phone className="h-3.5 w-3.5" />
            {initiateCall.isPending ? "Calling..." : "Call Now"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => { navigate("/messages"); onClose(); }}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Messages
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-6 mt-4 w-auto justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
            <Select
              value={lead.status || "new"}
              onValueChange={(val) => updateLead.mutate({ status: val as Lead["status"] })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["new","contacted","booked","active","completed","lost"].map(s => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contact info */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact</label>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="font-mono">{lead.phone}</span>
              </div>
              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{lead.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="capitalize text-xs">{lead.leadType}</span>
                <span>·</span>
                <span className="capitalize text-xs">{lead.source}</span>
              </div>
            </div>
          </div>

          {/* Quote details */}
          {(lead.calculatedPrice || lead.frequency || lead.homeSize) && (
            <div className="space-y-2 rounded-lg bg-muted/50 p-3">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quote Details</label>
              <div className="space-y-1.5 text-sm">
                {lead.calculatedPrice && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quoted price</span>
                    <span className="font-bold text-green-600 text-base">${lead.calculatedPrice}/visit</span>
                  </div>
                )}
                {lead.frequency && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frequency</span>
                    <span className="capitalize">{lead.frequency.replace(/-/g, " ")}</span>
                  </div>
                )}
                {lead.homeSize && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Home size</span>
                    <span className="capitalize">{lead.homeSize.replace(/_/g, " ")}</span>
                  </div>
                )}
                {addons.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Add-ons</span>
                    <span className="text-right text-xs">{addons.join(", ")}</span>
                  </div>
                )}
              </div>
              <div className="pt-1">
                <ActionTakenBadge action={lead.actionTaken} />
              </div>
            </div>
          )}

          {/* UTM tracking */}
          {(lead.utmSource || lead.utmMedium || lead.utmCampaign) && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Source Tracking</label>
              <div className="text-xs text-muted-foreground space-y-0.5">
                {lead.utmSource && <div>Source: {lead.utmSource}</div>}
                {lead.utmMedium && <div>Medium: {lead.utmMedium}</div>}
                {lead.utmCampaign && <div>Campaign: {lead.utmCampaign}</div>}
              </div>
            </div>
          )}

          {/* Created */}
          <div className="text-xs text-muted-foreground pt-1">
            Created {lead.createdAt ? format(new Date(lead.createdAt), "MMM d, yyyy 'at' h:mm a") : "unknown"}
          </div>
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity" className="flex-1 overflow-y-auto px-6 py-4">
          {activitiesLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}
            </div>
          ) : !activities?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
          ) : (
            <div className="relative border-l border-border ml-3 space-y-0">
              {activities.map((activity) => {
                const { label, icon: Icon, color, extra } = getActivityMeta(activity);
                return (
                  <div key={activity.id} className="relative pl-6 pb-5">
                    <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-background border-2 border-border flex items-center justify-center">
                      <Icon className={`h-2.5 w-2.5 ${color}`} />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{label}{extra}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.createdAt
                          ? formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })
                          : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
          <Textarea
            placeholder="Add notes about this lead..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex-1 min-h-[200px] resize-none text-sm"
          />
          <Button
            onClick={() => saveNotes.mutate()}
            disabled={saveNotes.isPending}
            size="sm"
            className="self-end"
          >
            {notesSaved ? "Saved ✓" : saveNotes.isPending ? "Saving..." : "Save Notes"}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Leads() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const form = useForm<CreateLeadForm>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: { firstName: "", lastName: "", phone: "", email: "", leadType: "residential", source: "form", status: "new" },
  });

  const createLead = useMutation({
    mutationFn: async (data: CreateLeadForm) => apiRequest("POST", "/api/leads", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setCreateOpen(false);
      form.reset();
      toast({ title: "Lead created" });
    },
    onError: () => toast({ title: "Failed to create lead", variant: "destructive" }),
  });

  const initiateCall = useMutation({
    mutationFn: async (leadId: string) => apiRequest("POST", "/api/calls/initiate", { leadId }),
    onSuccess: () => toast({ title: "📞 Connecting call to your phone..." }),
    onError: () => toast({ title: "Failed to initiate call", variant: "destructive" }),
  });

  const filteredLeads = leads?.filter((lead) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      lead.firstName?.toLowerCase().includes(s) ||
      lead.lastName?.toLowerCase().includes(s) ||
      lead.phone.includes(search) ||
      lead.email?.toLowerCase().includes(s)
    );
  }) ?? [];

  return (
    <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <PageHeader title="Leads" description="Manage your leads and prospects">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-lead">
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Add New Lead</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => createLead.mutate(d))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone *</FormLabel><FormControl><Input placeholder="+1 (919) 555-0123" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="john@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="leadType" render={({ field }) => (
                    <FormItem><FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="residential">Residential</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                          <SelectItem value="employment">Employment</SelectItem>
                        </SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="source" render={({ field }) => (
                    <FormItem><FormLabel>Source</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="call">Call</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="form">Form</SelectItem>
                          <SelectItem value="ad">Ad</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                        </SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createLead.isPending}>{createLead.isPending ? "Creating..." : "Create Lead"}</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Search */}
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search leads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Contact</th>
              <th className="text-left p-3 font-medium hidden lg:table-cell">Quote</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">Created</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b">
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="p-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                  ))}
                </tr>
              ))
            ) : filteredLeads.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No leads found</td></tr>
            ) : filteredLeads.map((lead) => (
              <tr
                key={lead.id}
                className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => setSelectedLead(lead)}
              >
                <td className="p-3">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {lead.firstName || lead.lastName
                        ? `${lead.firstName || ""} ${lead.lastName || ""}`.trim()
                        : "Unknown"}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">{lead.leadType}</span>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs">{lead.phone}</span>
                    {lead.email && <span className="text-xs text-muted-foreground truncate max-w-[140px]">{lead.email}</span>}
                  </div>
                </td>
                <td className="p-3 hidden lg:table-cell">
                  {lead.calculatedPrice ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-green-600">${lead.calculatedPrice}/visit</span>
                      {lead.frequency && <span className="text-xs text-muted-foreground capitalize">{lead.frequency.replace(/-/g," ")}</span>}
                    </div>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="p-3"><StatusBadge status={lead.status || "new"} type="lead" /></td>
                <td className="p-3 hidden md:table-cell">
                  <span className="text-xs text-muted-foreground">
                    {lead.createdAt ? formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true }) : "—"}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Call lead"
                      onClick={(e) => { e.stopPropagation(); initiateCall.mutate(lead.id); }}
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Open detail">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-2">
        {isLoading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)
        ) : filteredLeads.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No leads found</p>
        ) : filteredLeads.map((lead) => (
          <div
            key={lead.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card cursor-pointer active:bg-muted transition-colors"
            onClick={() => setSelectedLead(lead)}
          >
            <div className="flex flex-col min-w-0">
              <span className="font-medium truncate">
                {lead.firstName || lead.lastName
                  ? `${lead.firstName || ""} ${lead.lastName || ""}`.trim()
                  : "Unknown"}
              </span>
              <span className="text-xs text-muted-foreground font-mono">{lead.phone}</span>
              {lead.calculatedPrice && (
                <span className="text-xs font-semibold text-green-600">${lead.calculatedPrice}/visit</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusBadge status={lead.status || "new"} type="lead" />
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>

      {/* Lead detail sheet */}
      <Sheet open={!!selectedLead} onOpenChange={(open) => { if (!open) setSelectedLead(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
          {selectedLead && (
            <LeadDetail lead={selectedLead} onClose={() => setSelectedLead(null)} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
