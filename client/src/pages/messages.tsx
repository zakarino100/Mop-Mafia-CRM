import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, MessageSquare, ArrowDownLeft, ArrowUpRight, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { ConversationWithMessages } from "@shared/schema";

export default function Messages() {
  const [search, setSearch] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  const { data: conversations, isLoading } = useQuery<ConversationWithMessages[]>({
    queryKey: ["/api/conversations"],
  });

  const filteredConversations = conversations?.filter((conv) => {
    if (!search) return true;
    return (
      conv.lead?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      conv.lead?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      conv.lead?.phone.includes(search) ||
      conv.messages?.some((m) => m.body?.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const selectedConv = conversations?.find((c) => c.id === selectedConversation);

  return (
    <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6 h-[calc(100vh-4rem)]">
      <PageHeader
        title="Messages"
        description="View SMS and messaging conversations"
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-messages"
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-6 flex-1 min-h-0">
        <Card className={cn(
          "md:w-80 flex-shrink-0",
          selectedConversation && "hidden md:flex md:flex-col"
        )}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-20rem)]">
              {isLoading ? (
                <div className="space-y-2 p-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
                  ))}
                </div>
              ) : filteredConversations && filteredConversations.length > 0 ? (
                <div className="divide-y">
                  {filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={cn(
                        "p-4 cursor-pointer hover-elevate",
                        selectedConversation === conv.id && "bg-accent"
                      )}
                      onClick={() => setSelectedConversation(conv.id)}
                      data-testid={`conversation-${conv.id}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium truncate">
                          {conv.lead
                            ? `${conv.lead.firstName || ""} ${conv.lead.lastName || ""}`.trim() ||
                              conv.lead.phone
                            : "Unknown"}
                        </span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {conv.channel}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        {conv.lead?.phone}
                      </p>
                      {conv.messages && conv.messages.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {conv.messages[conv.messages.length - 1]?.body}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No conversations yet
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className={cn(
          "flex-1 flex flex-col",
          !selectedConversation && "hidden md:flex"
        )}>
          <CardHeader className="pb-3 border-b">
            {selectedConv ? (
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSelectedConversation(null)}
                  data-testid="button-back-to-conversations"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">
                    {selectedConv.lead
                      ? `${selectedConv.lead.firstName || ""} ${selectedConv.lead.lastName || ""}`.trim() ||
                        selectedConv.lead.phone
                      : "Unknown"}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-mono">
                    {selectedConv.lead?.phone}
                  </p>
                </div>
              </div>
            ) : (
              <CardTitle className="text-base font-medium text-muted-foreground">
                Select a conversation
              </CardTitle>
            )}
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            {selectedConv ? (
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  {selectedConv.messages && selectedConv.messages.length > 0 ? (
                    selectedConv.messages.map((msg) => (
                      <div
                        key={msg.messageSid}
                        className={cn(
                          "flex gap-2",
                          msg.direction === "outbound" ? "justify-end" : "justify-start"
                        )}
                        data-testid={`message-${msg.messageSid}`}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-lg px-4 py-2",
                            msg.direction === "outbound"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            {msg.direction === "inbound" ? (
                              <ArrowDownLeft className="h-3 w-3" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3" />
                            )}
                            <span className="text-xs opacity-70">
                              {msg.direction === "inbound" ? "Received" : "Sent"}
                            </span>
                          </div>
                          <p className="text-sm">{msg.body || "(No content)"}</p>
                          <div className="flex items-center justify-between gap-2 mt-2">
                            <span className="text-xs opacity-70">
                              {msg.sentAt
                                ? formatDistanceToNow(new Date(msg.sentAt), {
                                    addSuffix: true,
                                  })
                                : ""}
                            </span>
                            <StatusBadge
                              status={msg.status || "queued"}
                              type="message"
                              className="text-[10px] px-1.5 py-0"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      No messages in this conversation
                    </p>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to view messages</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
