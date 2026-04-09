import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck, Phone, Calendar, TrendingUp, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { formatDistanceToNow } from "date-fns";
import type { Lead, Call, Job } from "@shared/schema";

interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  totalCustomers: number;
  totalCalls: number;
  totalJobs: number;
  scheduledJobs: number;
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: recentLeads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: recentCalls, isLoading: callsLoading } = useQuery<Call[]>({
    queryKey: ["/api/calls"],
  });

  const { data: upcomingJobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  return (
    <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your CRM activity and key metrics"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Leads"
          value={stats?.totalLeads ?? 0}
          icon={Users}
          description="All time leads"
          isLoading={statsLoading}
        />
        <StatCard
          title="New Leads"
          value={stats?.newLeads ?? 0}
          icon={TrendingUp}
          description="Awaiting contact"
          isLoading={statsLoading}
        />
        <StatCard
          title="Customers"
          value={stats?.totalCustomers ?? 0}
          icon={UserCheck}
          description="Active customers"
          isLoading={statsLoading}
        />
        <StatCard
          title="Total Calls"
          value={stats?.totalCalls ?? 0}
          icon={Phone}
          description="All time calls"
          isLoading={statsLoading}
        />
        <StatCard
          title="Scheduled Jobs"
          value={stats?.scheduledJobs ?? 0}
          icon={Calendar}
          description="Upcoming cleanings"
          isLoading={statsLoading}
        />
        <StatCard
          title="Total Jobs"
          value={stats?.totalJobs ?? 0}
          icon={Calendar}
          description="All time jobs"
          isLoading={statsLoading}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Recent Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leadsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
                ))}
              </div>
            ) : recentLeads && recentLeads.length > 0 ? (
              <div className="space-y-3">
                {recentLeads.slice(0, 5).map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                    data-testid={`recent-lead-${lead.id}`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">
                        {lead.firstName || lead.lastName
                          ? `${lead.firstName || ""} ${lead.lastName || ""}`.trim()
                          : "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {lead.phone}
                      </span>
                    </div>
                    <StatusBadge status={lead.status || "new"} type="lead" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No leads yet
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Recent Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            {callsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
                ))}
              </div>
            ) : recentCalls && recentCalls.length > 0 ? (
              <div className="space-y-3">
                {recentCalls.slice(0, 5).map((call) => (
                  <div
                    key={call.callSid}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                    data-testid={`recent-call-${call.callSid}`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-mono truncate">
                        {call.direction === "inbound" ? call.fromNumber : call.toNumber}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {call.startedAt
                          ? formatDistanceToNow(new Date(call.startedAt), { addSuffix: true })
                          : "Unknown time"}
                      </span>
                    </div>
                    <StatusBadge status={call.callStatus || "initiated"} type="call" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No calls yet
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Upcoming Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
                ))}
              </div>
            ) : upcomingJobs && upcomingJobs.filter(j => j.status === "scheduled").length > 0 ? (
              <div className="space-y-3">
                {upcomingJobs.filter(j => j.status === "scheduled").slice(0, 5).map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                    data-testid={`upcoming-job-${job.id}`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium capitalize">
                        {job.serviceType?.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {job.scheduledDate
                          ? new Date(job.scheduledDate).toLocaleDateString()
                          : "Not scheduled"}
                      </span>
                    </div>
                    <StatusBadge status={job.status || "scheduled"} type="job" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No upcoming jobs
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
