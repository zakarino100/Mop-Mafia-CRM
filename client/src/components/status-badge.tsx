import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type LeadStatus = "new" | "contacted" | "booked" | "active" | "completed" | "lost";
type CallStatus = "initiated" | "ringing" | "in-progress" | "completed" | "busy" | "failed" | "no-answer" | "canceled";
type JobStatus = "scheduled" | "completed" | "cancelled";
type MessageStatus = "queued" | "sent" | "delivered" | "read" | "failed";

interface StatusBadgeProps {
  status: LeadStatus | CallStatus | JobStatus | MessageStatus | string;
  type?: "lead" | "call" | "job" | "message";
  className?: string;
}

const leadStatusStyles: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  booked: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  lost: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const callStatusStyles: Record<CallStatus, string> = {
  initiated: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ringing: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "in-progress": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  busy: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "no-answer": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  canceled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const jobStatusStyles: Record<JobStatus, string> = {
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const messageStatusStyles: Record<MessageStatus, string> = {
  queued: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  read: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function StatusBadge({ status, type = "lead", className }: StatusBadgeProps) {
  let styles = "";
  
  switch (type) {
    case "lead":
      styles = leadStatusStyles[status as LeadStatus] || "";
      break;
    case "call":
      styles = callStatusStyles[status as CallStatus] || "";
      break;
    case "job":
      styles = jobStatusStyles[status as JobStatus] || "";
      break;
    case "message":
      styles = messageStatusStyles[status as MessageStatus] || "";
      break;
  }

  return (
    <Badge
      variant="secondary"
      className={cn("capitalize font-medium no-default-hover-elevate no-default-active-elevate", styles, className)}
    >
      {status.replace(/-/g, " ").replace(/_/g, " ")}
    </Badge>
  );
}
