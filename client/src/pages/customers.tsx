import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, MapPin, DollarSign } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
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
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import type { CustomerWithLead, Lead } from "@shared/schema";

const createCustomerSchema = z.object({
  leadId: z.string().min(1, "Please select a lead"),
  billingName: z.string().optional(),
  serviceAddress: z.string().min(1, "Service address is required"),
  notes: z.string().optional(),
  lifetimeValue: z.number().min(0).default(0),
});

type CreateCustomerForm = z.infer<typeof createCustomerSchema>;

export default function Customers() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const { data: customers, isLoading } = useQuery<CustomerWithLead[]>({
    queryKey: ["/api/customers"],
  });

  const { data: leads } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const form = useForm<CreateCustomerForm>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      leadId: "",
      billingName: "",
      serviceAddress: "",
      notes: "",
      lifetimeValue: 0,
    },
  });

  const createCustomer = useMutation({
    mutationFn: async (data: CreateCustomerForm) => {
      return apiRequest("POST", "/api/customers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setOpen(false);
      form.reset();
      toast({ title: "Customer created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create customer", variant: "destructive" });
    },
  });

  const filteredCustomers = customers?.filter((customer) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      customer.billingName?.toLowerCase().includes(searchLower) ||
      customer.serviceAddress?.toLowerCase().includes(searchLower) ||
      customer.lead?.firstName?.toLowerCase().includes(searchLower) ||
      customer.lead?.lastName?.toLowerCase().includes(searchLower) ||
      customer.lead?.phone.includes(search)
    );
  });

  const columns = [
    {
      key: "billingName",
      header: "Customer",
      render: (customer: CustomerWithLead) => (
        <div className="flex flex-col">
          <span className="font-medium">
            {customer.billingName ||
              (customer.lead
                ? `${customer.lead.firstName || ""} ${customer.lead.lastName || ""}`.trim()
                : "Unknown")}
          </span>
          {customer.lead && (
            <span className="text-xs text-muted-foreground font-mono">
              {customer.lead.phone}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "serviceAddress",
      header: "Service Address",
      render: (customer: CustomerWithLead) => (
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="text-sm truncate max-w-[200px]">
            {customer.serviceAddress || "Not specified"}
          </span>
        </div>
      ),
    },
    {
      key: "lifetimeValue",
      header: "Lifetime Value",
      render: (customer: CustomerWithLead) => (
        <div className="flex items-center gap-1 font-mono">
          <DollarSign className="h-3 w-3 text-muted-foreground" />
          {(customer.lifetimeValue || 0).toLocaleString()}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Customer Since",
      render: (customer: CustomerWithLead) => (
        <span className="text-sm text-muted-foreground">
          {customer.createdAt
            ? formatDistanceToNow(new Date(customer.createdAt), { addSuffix: true })
            : "Unknown"}
        </span>
      ),
    },
  ];

  const availableLeads = leads?.filter(
    (lead) =>
      lead.status === "booked" || lead.status === "active" || lead.status === "contacted"
  );

  return (
    <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <PageHeader title="Customers" description="Manage your active customers">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-customer">
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => createCustomer.mutate(data))}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="leadId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-lead">
                            <SelectValue placeholder="Select a lead to promote" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableLeads?.map((lead) => (
                            <SelectItem key={lead.id} value={lead.id}>
                              {lead.firstName || lead.lastName
                                ? `${lead.firstName || ""} ${lead.lastName || ""}`.trim()
                                : lead.phone}{" "}
                              - {lead.phone}
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
                  name="billingName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Doe"
                          {...field}
                          data-testid="input-billing-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="serviceAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Address *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="123 Main St, Raleigh, NC 27601"
                          {...field}
                          data-testid="input-service-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any special instructions or notes..."
                          {...field}
                          data-testid="input-notes"
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
                    disabled={createCustomer.isPending}
                    data-testid="button-submit-customer"
                  >
                    {createCustomer.isPending ? "Creating..." : "Create Customer"}
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
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-customers"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredCustomers || []}
        isLoading={isLoading}
        emptyMessage="No customers found. Promote a lead to customer to get started."
        rowTestIdPrefix="customer"
        getRowId={(customer) => customer.id}
      />
    </div>
  );
}
