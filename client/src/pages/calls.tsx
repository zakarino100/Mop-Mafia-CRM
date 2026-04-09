import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, PhoneIncoming, PhoneOutgoing, Clock,
  AlertTriangle, PhoneOff, PhoneMissed, PhoneCall,
  Hash
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";
import type { CallWithLead } from "@shared/schema";

const IVR_LABELS: Record<string, { label: string; color: string }> = {
  "1": { label: "Quote request",       color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  "2": { label: "Existing customer",   color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  "3": { label: "Commercial inquiry",  color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
  "4": { label: "Employment",          color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
  "timeout": { label: "No option pressed", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  "0": { label: "No option pressed",   color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

function IvrBadge({ option }: { option: string | null }) {
  if (!option) return <span className="text-xs text-muted-foreground italic">Pre-IVR</span>;
  const info = IVR_LABELS[option];
  if (!info) return <span className="text-xs text-muted-foreground">Option {option}</span>;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${info.color}`}>
      {(option === "timeout" || option === "0") && <AlertTriangle className="h-3 w-3" />}
      {info.label}
    </span>
  );
}

function OwnerResponseBadge({ call }: { call: CallWithLead }) {
  const status = call.callStatus;
  const hungUpBy = call.hungUpBy;

  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
        <PhoneCall className="h-3 w-3" />
        Answered
        {hungUpBy && (
          <span className="text-muted-foreground">
            · {hungUpBy === "caller" ? "caller hung up" : "owner hung up"}
          </span>
        )}
      </span>
    );
  }
  if (status === "no-answer") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-yellow-700 dark:text-yellow-400">
        <PhoneMissed className="h-3 w-3" />
        Not answered
      </span>
    );
  }
  if (status === "busy") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-orange-700 dark:text-orange-400">
        <PhoneOff className="h-3 w-3" />
        Line busy
      </span>
    );
  }
  if (status === "canceled") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <PhoneOff className="h-3 w-3" />
        Caller hung up
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
        <PhoneOff className="h-3 w-3" />
        Failed
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground capitalize">{status ?? "—"}</span>
  );
}

function isLikelySpam(call: CallWithLead): boolean {
  const noOption = !call.ivrOption || call.ivrOption === "timeout" || call.ivrOption === "0";
  const shortOrMissed = (call.durationSeconds ?? 0) < 10 || call.callStatus === "canceled";
  return noOption && shortOrMissed;
}

export default function Calls() {
  const [search, setSearch] = useState("");

  const { data: calls, isLoading } = useQuery<CallWithLead[]>({
    queryKey: ["/api/calls"],
  });

  const filteredCalls = calls?.filter((call) => {
    if (!search) return true;
    return (
      call.fromNumber.includes(search) ||
      call.toNumber.includes(search) ||
      call.lead?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      call.lead?.lastName?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const columns = [
    {
      key: "direction",
      header: "",
      className: "w-8",
      render: (call: CallWithLead) =>
        call.direction === "inbound" ? (
          <PhoneIncoming className="h-4 w-4 text-green-600 dark:text-green-400" />
        ) : (
          <PhoneOutgoing className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        ),
    },
    {
      key: "contact",
      header: "Contact",
      render: (call: CallWithLead) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            {isLikelySpam(call) && (
              <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" title="Likely spam" />
            )}
            <span className="font-medium">
              {call.lead?.firstName || call.lead?.lastName
                ? `${call.lead.firstName || ""} ${call.lead.lastName || ""}`.trim()
                : "Unknown"}
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {call.direction === "inbound" ? call.fromNumber : call.toNumber}
          </span>
        </div>
      ),
    },
    {
      key: "ivr",
      header: "IVR Selection",
      render: (call: CallWithLead) => (
        <IvrBadge option={call.ivrOption ?? null} />
      ),
    },
    {
      key: "ownerResponse",
      header: "Owner Response",
      render: (call: CallWithLead) => <OwnerResponseBadge call={call} />,
    },
    {
      key: "duration",
      header: "Duration",
      render: (call: CallWithLead) => (
        <div className="flex items-center gap-1 text-sm">
          <Clock className="h-3 w-3 text-muted-foreground" />
          {formatDuration(call.durationSeconds)}
        </div>
      ),
    },
    {
      key: "startedAt",
      header: "Time",
      render: (call: CallWithLead) => (
        <div className="flex flex-col text-sm">
          <span>
            {call.startedAt ? format(new Date(call.startedAt), "MMM d, h:mm a") : "Unknown"}
          </span>
          <span className="text-xs text-muted-foreground">
            {call.startedAt ? formatDistanceToNow(new Date(call.startedAt), { addSuffix: true }) : ""}
          </span>
        </div>
      ),
    },
  ];

  const spamCount = filteredCalls?.filter(isLikelySpam).length ?? 0;

  return (
    <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <PageHeader
        title="Calls"
        description="View call history with IVR selections and owner responses"
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-calls"
          />
        </div>
        {spamCount > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <span>{spamCount} likely spam {spamCount === 1 ? "call" : "calls"}</span>
          </div>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filteredCalls || []}
        isLoading={isLoading}
        emptyMessage="No calls recorded yet. Calls will appear here when received via Twilio."
        rowTestIdPrefix="call"
        getRowId={(call) => call.callSid}
      />
    </div>
  );
}
