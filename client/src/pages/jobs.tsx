import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { JobWithCustomer, CustomerWithLead } from "@shared/schema";

const createJobSchema = z.object({
  customerId: z.string().min(1, "Please select a customer"),
  serviceType: z.enum([
    "house_cleaning",
    "deep_clean",
    "move_out",
    "move_in",
    "commercial",
    "post_construction",
    "recurring",
  ]),
  scheduledDate: z.date({ required_error: "Please select a date" }),
  arrivalWindowStart: z.string().optional(),
  arrivalWindowEnd: z.string().optional(),
  status: z.enum(["scheduled", "completed", "cancelled"]).default("scheduled"),
  notes: z.string().optional(),
});

type CreateJobForm = z.infer<typeof createJobSchema>;

const serviceTypeLabels: Record<string, string> = {
  house_cleaning: "House Cleaning",
  deep_clean: "Deep Clean",
  move_out: "Move Out",
  move_in: "Move In",
  commercial: "Commercial",
  post_construction: "Post Construction",
  recurring: "Recurring",
};

export default function Jobs() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const { data: jobs, isLoading } = useQuery<JobWithCustomer[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: customers } = useQuery<CustomerWithLead[]>({
    queryKey: ["/api/customers"],
  });

  const form = useForm<CreateJobForm>({
    resolver: zodResolver(createJobSchema),
    defaultValues: {
      customerId: "",
      serviceType: "house_cleaning",
      arrivalWindowStart: "09:00",
      arrivalWindowEnd: "11:00",
      status: "scheduled",
      notes: "",
    },
  });

  const createJob = useMutation({
    mutationFn: async (data: CreateJobForm) => {
      return apiRequest("POST", "/api/jobs", {
        ...data,
        scheduledDate: data.scheduledDate.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setOpen(false);
      form.reset();
      toast({ title: "Job scheduled successfully" });
    },
    onError: () => {
      toast({ title: "Failed to schedule job", variant: "destructive" });
    },
  });

  const filteredJobs = jobs?.filter((job) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      job.serviceType?.includes(searchLower) ||
      job.customer?.billingName?.toLowerCase().includes(searchLower) ||
      job.customer?.serviceAddress?.toLowerCase().includes(searchLower) ||
      job.customer?.lead?.firstName?.toLowerCase().includes(searchLower) ||
      job.customer?.lead?.lastName?.toLowerCase().includes(searchLower)
    );
  });

  const columns = [
    {
      key: "customer",
      header: "Customer",
      render: (job: JobWithCustomer) => (
        <div className="flex flex-col">
          <span className="font-medium">
            {job.customer?.billingName ||
              (job.customer?.lead
                ? `${job.customer.lead.firstName || ""} ${job.customer.lead.lastName || ""}`.trim()
                : "Unknown")}
          </span>
          {job.customer?.serviceAddress && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-[180px]">{job.customer.serviceAddress}</span>
            </span>
          )}
        </div>
      ),
    },
    {
      key: "serviceType",
      header: "Service",
      render: (job: JobWithCustomer) => (
        <span className="text-sm">
          {serviceTypeLabels[job.serviceType] || job.serviceType}
        </span>
      ),
    },
    {
      key: "scheduledDate",
      header: "Scheduled",
      render: (job: JobWithCustomer) => (
        <div className="flex flex-col">
          <span className="flex items-center gap-1 text-sm">
            <CalendarIcon className="h-3 w-3 text-muted-foreground" />
            {job.scheduledDate
              ? format(new Date(job.scheduledDate), "MMM d, yyyy")
              : "Not scheduled"}
          </span>
          {job.arrivalWindowStart && job.arrivalWindowEnd && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {job.arrivalWindowStart} - {job.arrivalWindowEnd}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (job: JobWithCustomer) => (
        <StatusBadge status={job.status || "scheduled"} type="job" />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <PageHeader title="Jobs" description="Schedule and manage cleaning jobs">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-job">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Job
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule New Job</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => createJob.mutate(data))}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-customer">
                            <SelectValue placeholder="Select a customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers?.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.billingName ||
                                (customer.lead
                                  ? `${customer.lead.firstName || ""} ${customer.lead.lastName || ""}`.trim()
                                  : customer.id)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="serviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-service-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(serviceTypeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-select-date"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP") : "Pick a date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="arrivalWindowStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Arrival Start</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            data-testid="input-arrival-start"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="arrivalWindowEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Arrival End</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            data-testid="input-arrival-end"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Special instructions, access codes, etc..."
                          {...field}
                          data-testid="input-job-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createJob.isPending}
                    data-testid="button-submit-job"
                  >
                    {createJob.isPending ? "Scheduling..." : "Schedule Job"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-jobs"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredJobs || []}
        isLoading={isLoading}
        emptyMessage="No jobs scheduled yet. Schedule your first job to get started."
        rowTestIdPrefix="job"
        getRowId={(job) => job.id}
      />
    </div>
  );
}
