import { useQuery, useMutation } from "@tanstack/react-query";
import { Settings2, MessageSquare, Zap, Bell, Phone } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function Settings() {
  const { toast } = useToast();
  const [ownerPhone, setOwnerPhone] = useState("");

  const { data: settings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings?.owner_phone) setOwnerPhone(settings.owner_phone);
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: async (updates: Record<string, string>) =>
      apiRequest("PUT", "/api/settings", updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved" });
    },
    onError: () => toast({ title: "Failed to save settings", variant: "destructive" }),
  });

  const toggle = (key: string, current: string) => {
    const newVal = current === "false" ? "true" : "false";
    updateSettings.mutate({ [key]: newVal });
  };

  const isOn = (key: string, defaultOn = false) => {
    if (!settings) return defaultOn;
    if (!(key in settings)) return defaultOn;
    return settings[key] !== "false";
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6 max-w-2xl">
      <PageHeader title="Settings" description="Configure automations and notifications" />

      {/* Owner Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Owner SMS Alerts
          </CardTitle>
          <CardDescription>
            Text the owner when a new lead submits the quote form. Includes their name, phone, and quoted price.
            A 5-minute buffer prevents duplicate alerts from CTA clicks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="owner-sms" className="flex flex-col gap-1 cursor-pointer">
              <span>New lead SMS alert</span>
              <span className="text-xs font-normal text-muted-foreground">
                Sends immediately when a lead is created
              </span>
            </Label>
            <Switch
              id="owner-sms"
              checked={isOn("owner_sms_enabled", true)}
              onCheckedChange={() => toggle("owner_sms_enabled", settings?.owner_sms_enabled ?? "true")}
              disabled={isLoading || updateSettings.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-phone">Owner phone number</Label>
            <div className="flex gap-2">
              <Input
                id="owner-phone"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="+13159357169"
                className="font-mono"
              />
              <Button
                variant="outline"
                onClick={() => updateSettings.mutate({ owner_phone: ownerPhone })}
                disabled={updateSettings.isPending}
              >
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Include country code, e.g. +13159357169</p>
          </div>
        </CardContent>
      </Card>

      {/* Lead Nurturing */}
      <Card className="opacity-80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" />
            Lead Nurturing Sequences
            <Badge variant="outline" className="text-xs ml-1">Coming Soon</Badge>
          </CardTitle>
          <CardDescription>
            Automatically follow up with leads who viewed a quote but didn't book.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="nurturing" className="flex flex-col gap-1 cursor-pointer">
              <span>Enable nurturing sequences</span>
              <span className="text-xs font-normal text-muted-foreground">
                Will send automated follow-up messages over 3–7 days
              </span>
            </Label>
            <Switch
              id="nurturing"
              checked={isOn("lead_nurturing_enabled", false)}
              onCheckedChange={() => toggle("lead_nurturing_enabled", settings?.lead_nurturing_enabled ?? "false")}
              disabled={true}
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Submission SMS */}
      <Card className="opacity-80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Form Submission SMS to Lead
            <Badge variant="outline" className="text-xs ml-1">Coming Soon</Badge>
          </CardTitle>
          <CardDescription>
            Automatically text the lead when they submit the quote form — instant confirmation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="form-sms" className="flex flex-col gap-1 cursor-pointer">
              <span>Send confirmation SMS on form submit</span>
              <span className="text-xs font-normal text-muted-foreground">
                Sends from the Mop Mafia Twilio number
              </span>
            </Label>
            <Switch
              id="form-sms"
              checked={isOn("form_submission_sms_enabled", false)}
              onCheckedChange={() => toggle("form_submission_sms_enabled", settings?.form_submission_sms_enabled ?? "false")}
              disabled={true}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
