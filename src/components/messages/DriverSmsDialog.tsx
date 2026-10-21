import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Send, Search, X, MessageSquare, User, ArrowLeft, Inbox, Check, CheckCheck, Users, CheckSquare, Square, FileText, Save, Trash2 } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { nationalityRecipients, templateNationalities } from "@/utils/smsTemplates";
import { collectMessagePages, deliverPrivateMessageBatches } from "@/utils/privateMessageDelivery";

interface DriverCredential {
  id: string;
  driver_id: string;
  user_id: string | null;
  status: string;
}

interface PrivateMessage {
  id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

type ViewMode = "list" | "single" | "bulk";

interface DriverSmsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DriverSmsDialog = ({ isOpen, onClose }: DriverSmsDialogProps) => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<DriverCredential | null>(null);
  const [selectedDriverIds, setSelectedDriverIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedTemplateId, setSelectedTemplateId] = useState("new");
  const [templateTitle, setTemplateTitle] = useState("");
  const [selectedNationalities, setSelectedNationalities] = useState<string[]>([]);
  const [templateText, setTemplateText] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all driver credentials with pagination to get all records
  const { data: drivers = [], isLoading, isError: driverLoadError } = useQuery({
    queryKey: ["driver-credentials-sms"],
    queryFn: async () => {
      const allDrivers: DriverCredential[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("driver_credentials")
          .select("id, driver_id, user_id, status")
          .eq("status", "enabled")
          .order("driver_id", { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allDrivers.push(...(data as DriverCredential[]));
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      return allDrivers;
    },
    enabled: isOpen,
  });

  // Fetch Yango driver list (driver_id -> nationality) with pagination
  const { data: yangoDrivers = [], isLoading: loadingNationalities, isError: nationalityLoadError } = useQuery({
    queryKey: ["yango-driver-nationalities"],
    queryFn: async () => {
      const all: { driver_id: string; nationality: string | null }[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("yango_driver_list")
          .select("driver_id, nationality")
          .order("id", { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          all.push(...(data as { driver_id: string; nationality: string | null }[]));
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      return all;
    },
    enabled: isOpen,
  });

  // Distinct nationalities from the Yango driver list
  const nationalities = useMemo(() => {
    const set = new Set<string>();
    yangoDrivers.forEach((d) => {
      const n = (d.nationality || "").trim();
      if (n) set.add(n);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [yangoDrivers]);

  // driver_id -> nationality lookup
  const nationalityByDriverId = useMemo(() => {
    const map = new Map<string, string>();
    yangoDrivers.forEach((d) => {
      const n = (d.nationality || "").trim();
      if (n) map.set(d.driver_id, n);
    });
    return map;
  }, [yangoDrivers]);

  // Saved message templates per nationality
  const { data: templates = [] } = useQuery({
    queryKey: ["nationality-message-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nationality_message_templates")
        .select("id, nationality, nationalities, title, message")
        .order("title", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  // Admin check (only admins can save/edit templates)
  const { data: isAdmin = false } = useQuery({
    queryKey: ["sms-dialog-is-admin"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
    enabled: isOpen,
  });

  const matchingDriverIds = useMemo(
    () => nationalityRecipients(drivers, yangoDrivers, selectedNationalities),
    [selectedNationalities, yangoDrivers, drivers],
  );
  const nationalityOptions = useMemo(
    () => Array.from(new Set([...nationalities, ...selectedNationalities])).sort((a, b) => a.localeCompare(b)),
    [nationalities, selectedNationalities],
  );

  const handleTemplateChange = (value: string) => {
    setSelectedTemplateId(value);
    const existing = templates.find((t) => t.id === value);
    setTemplateTitle(existing?.title || "");
    setSelectedNationalities(existing ? templateNationalities(existing) : []);
    setTemplateText(existing?.message || "");
  };

  const handleSaveTemplate = async () => {
    if (!isAdmin) return;
    if (!templateTitle.trim() || !selectedNationalities.length || !templateText.trim()) {
      toast.error("Enter a template name, message and select at least one nationality");
      return;
    }
    setSavingTemplate(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const existing = templates.find((t) => t.id === selectedTemplateId);
      const values = {
        title: templateTitle.trim(),
        message: templateText.trim(),
        nationalities: selectedNationalities,
        nationality: selectedNationalities[0],
      };
      if (existing) {
        const { error } = await supabase
          .from("nationality_message_templates")
          .update(values)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("nationality_message_templates")
          .insert({
            ...values,
            created_by: user.id,
          })
          .select("id")
          .single();
        if (error) throw error;
        setSelectedTemplateId(data.id);
      }
      toast.success(`Template "${templateTitle.trim()}" saved`);
      queryClient.invalidateQueries({ queryKey: ["nationality-message-templates"] });
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!isAdmin) return;
    const existing = templates.find((t) => t.id === selectedTemplateId);
    if (!existing) return;
    if (!window.confirm(`Delete template "${existing.title}"? This cannot be undone.`)) return;
    setSavingTemplate(true);
    try {
      const { error } = await supabase
        .from("nationality_message_templates")
        .delete()
        .eq("id", existing.id);
      if (error) throw error;
      setSelectedTemplateId("new");
      setTemplateTitle("");
      setTemplateText("");
      setSelectedNationalities([]);
      toast.success(`Template "${existing.title}" deleted`);
      queryClient.invalidateQueries({ queryKey: ["nationality-message-templates"] });
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleUseTemplate = () => {
    if (isLoading || loadingNationalities || driverLoadError || nationalityLoadError) {
      toast.error("Driver or nationality list is not ready. Please reopen and try again.");
      return;
    }
    if (matchingDriverIds.length === 0) {
      toast.error("No active drivers found for the selected nationalities");
      return;
    }
    setSelectedDriverIds(new Set(matchingDriverIds));
    if (templateText.trim()) setMessage(templateText.trim());
    setViewMode("bulk");
  };

  // Fetch message history for selected driver
  const { data: messageHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["driver-message-history", selectedDriver?.driver_id],
    queryFn: async () => {
      if (!selectedDriver?.driver_id) return [];

      // Filter messages that are private to this driver
      const privatePrefix = `[PRIVATE TO: ${selectedDriver.driver_id}]`;
      const data = await collectMessagePages(async (from, to) => {
        const { data, error } = await supabase.from("admin_messages")
          .select("id, content, created_at, read_at")
          .eq("is_admin", true).like("content", `${privatePrefix}%`)
          .order("created_at", { ascending: true }).order("id", { ascending: true })
          .range(from, to);
        if (error) throw error;
        return data || [];
      });
      const privateMessages = data
        .filter((msg) => msg.content.startsWith(privatePrefix))
        .map((msg) => ({
          id: msg.id,
          content: msg.content.replace(privatePrefix, "").trim(),
          created_at: msg.created_at || "",
          read_at: msg.read_at,
        }));

      return privateMessages as PrivateMessage[];
    },
    enabled: !!selectedDriver?.driver_id,
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!selectedDriver?.driver_id) return;

    const channel = supabase
      .channel(`admin-sms-${selectedDriver.driver_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_messages',
        },
        (payload) => {
          const newMessage = payload.new as { content: string; is_admin: boolean };
          const privatePrefix = `[PRIVATE TO: ${selectedDriver.driver_id}]`;
          
          // Only refetch if the message is for this driver
          if (newMessage.is_admin && newMessage.content.startsWith(privatePrefix)) {
            queryClient.invalidateQueries({ queryKey: ["driver-message-history", selectedDriver.driver_id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDriver?.driver_id, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messageHistory]);

  // Filter drivers based on search
  const filteredDrivers = drivers.filter((driver) =>
    driver.driver_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if all filtered drivers are selected
  const allFilteredSelected = filteredDrivers.length > 0 && 
    filteredDrivers.every(driver => selectedDriverIds.has(driver.driver_id));

  // Toggle select all
  const handleSelectAll = () => {
    if (allFilteredSelected) {
      // Deselect all filtered drivers
      const newSet = new Set(selectedDriverIds);
      filteredDrivers.forEach(driver => newSet.delete(driver.driver_id));
      setSelectedDriverIds(newSet);
    } else {
      // Select all filtered drivers
      const newSet = new Set(selectedDriverIds);
      filteredDrivers.forEach(driver => newSet.add(driver.driver_id));
      setSelectedDriverIds(newSet);
    }
  };

  // Toggle individual driver selection
  const handleToggleDriver = (driverId: string) => {
    const newSet = new Set(selectedDriverIds);
    if (newSet.has(driverId)) {
      newSet.delete(driverId);
    } else {
      newSet.add(driverId);
    }
    setSelectedDriverIds(newSet);
  };

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ driverId, content }: { driverId: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Store the private message in a format that targets the specific driver
      const { error } = await supabase.from("admin_messages").insert({
        content: `[PRIVATE TO: ${driverId}] ${content}`,
        created_by: user.id,
        is_admin: true,
        is_pinned: false,
      });

      if (error) throw error;
    },
  });

  const notifyDrivers = async (driverIds: string[], content: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("send-message-notification", {
        body: { type: "private", driverIds, messageContent: content },
      });
      if (error) {
        const details = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
        console.error("Message notification failed:", details);
        throw new Error("Notification request failed");
      }
      if (!data || typeof data.sent !== "number") throw new Error("Missing notification result");
      toast.info(`${data.sent} device notification${data.sent === 1 ? "" : "s"} accepted`, {
        description: `${data.coveredDrivers ?? 0} of ${driverIds.length} drivers have registered notifications. Portal messages remain available even without notifications.`,
      });
      if (data.failed > 0) toast.warning(`${data.failed} device notification${data.failed === 1 ? "" : "s"} failed`);
    } catch {
      toast.warning("Portal messages saved, but device notifications could not be confirmed");
    }
  };

  // Send to single driver
  const handleSendMessage = async () => {
    if (isSending) return;
    if (!selectedDriver || !message.trim()) {
      toast.error("Please select a driver and enter a message");
      return;
    }

    setIsSending(true);
    try {
      await sendMessageMutation.mutateAsync({
        driverId: selectedDriver.driver_id,
        content: message.trim(),
      });
      toast.success("Message sent successfully!", {
        description: `Private message sent to Driver ${selectedDriver.driver_id}`,
      });
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
      queryClient.invalidateQueries({ queryKey: ["driver-message-history", selectedDriver?.driver_id] });

      await notifyDrivers([selectedDriver.driver_id], message.trim());
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  // Send to multiple drivers (bulk)
  const handleSendBulkMessage = async () => {
    if (isSending) return;
    if (selectedDriverIds.size === 0 || !message.trim()) {
      toast.error("Please select at least one driver and enter a message");
      return;
    }

    setIsSending(true);
    const driverIdsArray = Array.from(selectedDriverIds);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { sentIds, failedIds } = await deliverPrivateMessageBatches(driverIdsArray, async batch => {
        const insertData = batch.map(driverId => ({
          content: `[PRIVATE TO: ${driverId}] ${message.trim()}`,
          created_by: user.id,
          is_admin: true,
          is_pinned: false,
        }));

        const { error } = await supabase.from("admin_messages").insert(insertData);
        
        if (error) throw error;
      });
      const successCount = sentIds.length;
      const failCount = failedIds.length;

      if (successCount > 0) {
        toast.success(`Message sent to ${successCount} driver${successCount > 1 ? 's' : ''}!`, {
          description: failCount > 0 ? `Failed to send to ${failCount} driver(s)` : undefined,
        });

        await notifyDrivers(sentIds, message.trim());
        setSelectedDriverIds(new Set(failedIds));
        if (failCount === 0) {
          setMessage("");
          setViewMode("list");
        } else {
          toast.warning("Only failed drivers remain selected. Send again to retry them.");
        }
        queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
      } else {
        toast.error("Failed to send messages");
      }
    } catch (error) {
      console.error("Error sending bulk messages:", error);
      toast.error("Failed to send messages");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (isSending) return;
    setSearchQuery("");
    setSelectedDriver(null);
    setSelectedDriverIds(new Set());
    setMessage("");
    setViewMode("list");
    setSelectedTemplateId("new");
    setTemplateTitle("");
    setSelectedNationalities([]);
    setTemplateText("");
    onClose();
  };

  const handleBackToList = () => {
    setSelectedDriver(null);
    setViewMode("list");
  };

  const content = (
    <div className="flex flex-col h-full max-h-[70vh] overflow-y-auto">
      {(driverLoadError || nationalityLoadError) && <p role="alert" className="text-sm text-destructive">Unable to load the complete driver or nationality list. Reopen this window to try again.</p>}
      {/* Driver Selection List */}
      {viewMode === "list" && (
        <div className="flex flex-col gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by Driver ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selection Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="flex items-center gap-2"
            >
              {allFilteredSelected ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {allFilteredSelected ? "Deselect All" : "Select All"}
            </Button>
            {selectedDriverIds.size > 0 && (
              <Button
                size="sm"
                onClick={() => setViewMode("bulk")}
                className="flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Send to {selectedDriverIds.size} Driver{selectedDriverIds.size > 1 ? 's' : ''}
              </Button>
            )}
          </div>

          {/* Active driver count */}
          <p className="text-xs text-muted-foreground">
            {isLoading
              ? "Loading active drivers..."
              : searchQuery
                ? `${filteredDrivers.length} of ${drivers.length} active drivers`
                : `${drivers.length} active drivers`}
          </p>

          {/* Message Templates Per Nationality */}
          <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
            <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary" />
              Message Templates Per Nationality
            </p>
            <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
              <SelectTrigger className="min-h-11 text-sm" aria-label="Saved SMS template">
                <SelectValue placeholder="Select template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">{isAdmin ? "New Template" : "Select template..."}</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>{template.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(isAdmin || selectedTemplateId !== "new") && (
              <>
                <label className="block space-y-1 text-xs font-medium">
                  <span>Template name</span>
                  <Input placeholder="Template 1" value={templateTitle} onChange={(e) => setTemplateTitle(e.target.value)} readOnly={!isAdmin} disabled={savingTemplate} className="min-h-11" />
                </label>
                <label className="block space-y-1 text-xs font-medium">
                  <span>Message contents</span>
                <Textarea
                  placeholder="Enter message contents..."
                  value={templateText}
                  onChange={(e) => isAdmin && setTemplateText(e.target.value)}
                  readOnly={!isAdmin}
                  disabled={savingTemplate}
                  className="min-h-[70px] resize-none text-sm"
                />
                </label>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium">Preview</p>
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary/10 border border-primary/20 px-3 py-2">
                      <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                        {templateText.trim() ? templateText : <span className="text-muted-foreground italic">Message preview will appear here...</span>}
                      </p>
                    </div>
                  </div>
                  <p className="text-right text-[11px] text-muted-foreground">
                    {templateText.length} character{templateText.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <fieldset disabled={savingTemplate}>
                  <legend className="mb-1 text-xs font-medium">Nationalities ({selectedNationalities.length} selected)</legend>
                  <div className="max-h-36 overflow-y-auto rounded-md border border-border bg-background p-2">
                    {nationalityOptions.length === 0 && <p className="text-xs text-muted-foreground">No nationalities found in the uploaded Yango driver list.</p>}
                    {nationalityOptions.map((nationality) => (
                      <label key={nationality} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                        <Checkbox checked={selectedNationalities.includes(nationality)} onCheckedChange={(checked) => setSelectedNationalities((current) => checked === true ? [...current, nationality] : current.filter((value) => value !== nationality))} />
                        <span className="break-words">{nationality}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="flex flex-wrap gap-2">
                  {isAdmin && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveTemplate}
                        disabled={savingTemplate || !templateTitle.trim() || !templateText.trim() || !selectedNationalities.length}
                        className="flex min-h-11 items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {savingTemplate ? "Saving..." : selectedTemplateId !== "new" ? "Save Changes" : "Save Template"}
                      </Button>
                      {selectedTemplateId !== "new" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDeleteTemplate}
                          disabled={savingTemplate}
                          className="flex min-h-11 items-center gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </Button>
                      )}
                    </>
                  )}
                  <Button
                    size="sm"
                    onClick={handleUseTemplate}
                    disabled={savingTemplate || isLoading || loadingNationalities || driverLoadError || nationalityLoadError || matchingDriverIds.length === 0 || !templateText.trim()}
                    className="flex min-h-11 items-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Select {matchingDriverIds.length} Driver{matchingDriverIds.length !== 1 ? "s" : ""} & Use
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {matchingDriverIds.length} active driver{matchingDriverIds.length !== 1 ? "s" : ""} across {selectedNationalities.length} nationalit{selectedNationalities.length === 1 ? "y" : "ies"}.
                </p>
              </>
            )}
          </div>

          {/* Driver List */}
          <ScrollArea className="h-[280px] border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center h-full p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground">
                <User className="w-12 h-12 mb-2 opacity-50" />
                <p>No drivers found</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-all",
                      "hover:bg-primary/10 hover:border-primary/30",
                      "border",
                      selectedDriverIds.has(driver.driver_id) 
                        ? "border-primary/50 bg-primary/5" 
                        : "border-transparent"
                    )}
                  >
                    {/* Checkbox */}
                    <Checkbox
                      checked={selectedDriverIds.has(driver.driver_id)}
                      onCheckedChange={() => handleToggleDriver(driver.driver_id)}
                      className="data-[state=checked]:bg-primary"
                    />
                    
                    {/* Driver Info - Clickable to open individual chat */}
                    <button
                      onClick={() => {
                        setSelectedDriver(driver);
                        setViewMode("single");
                      }}
                      className="flex-1 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                        {driver.driver_id.slice(0, 2)}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-foreground">
                          Driver ID: {driver.driver_id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Status: {driver.status}
                        </p>
                      </div>
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Single Driver Chat View */}
      {viewMode === "single" && selectedDriver && (
        <div className="flex flex-col gap-3 h-full">
          {/* Selected Driver Header */}
          <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToList}
              className="h-8 w-8"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
              {selectedDriver.driver_id.slice(0, 2)}
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">
                Driver ID: {selectedDriver.driver_id}
              </p>
              <p className="text-xs text-muted-foreground">Private Message</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToList}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Message History */}
          <div className="flex-1 border rounded-lg bg-muted/30 overflow-hidden">
            <ScrollArea className="h-[200px]">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center h-full p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : messageHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-muted-foreground">
                  <Inbox className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-sm">No message history</p>
                  <p className="text-xs">Start the conversation below</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {messageHistory.map((msg) => (
                    <div
                      key={msg.id}
                      className="flex justify-end"
                    >
                      <div className="max-w-[85%] p-3 rounded-lg bg-primary text-primary-foreground">
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <p className="text-[10px] opacity-70">
                            {msg.created_at && format(new Date(msg.created_at), "MMM d, h:mm a")}
                          </p>
                          <span title={msg.read_at ? `Read ${format(new Date(msg.read_at), "MMM d, h:mm a")}` : "Sent"}>
                            {msg.read_at ? (
                              <CheckCheck className="w-3 h-3 text-blue-300" />
                            ) : (
                              <Check className="w-3 h-3 opacity-70" />
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Message Input */}
          <Textarea
            placeholder="Type your private message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[80px] resize-none"
          />

          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || isSending}
            className="w-full gap-2"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Private Message
              </>
            )}
          </Button>
        </div>
      )}

      {/* Bulk Message View */}
      {viewMode === "bulk" && (
        <div className="flex flex-col gap-3 h-full">
          <p className="text-xs text-muted-foreground">Delivery: Driver Portal private message and registered device notification. Not phone SMS.</p>
          {/* Header */}
          <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToList}
              className="h-8 w-8"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold text-sm">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">
                Bulk Message
              </p>
              <p className="text-xs text-muted-foreground">
                Sending to {selectedDriverIds.size} driver{selectedDriverIds.size > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Selected Drivers Preview */}
          <div className="border rounded-lg p-3 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">Selected Drivers:</p>
            <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto">
              {Array.from(selectedDriverIds).slice(0, 20).map((driverId) => (
                <span
                  key={driverId}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                >
                  {driverId}
                  <button
                    onClick={() => handleToggleDriver(driverId)}
                    className="hover:bg-primary/20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {selectedDriverIds.size > 20 && (
                <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                  +{selectedDriverIds.size - 20} more
                </span>
              )}
            </div>
          </div>

          {/* Message Input */}
          <Textarea
            placeholder="Type your message for all selected drivers..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[100px] resize-none flex-1"
          />

          {/* Send Button */}
          <Button
            onClick={handleSendBulkMessage}
            disabled={!message.trim() || isSending || selectedDriverIds.size === 0}
            className="w-full gap-2"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Sending to {selectedDriverIds.size} drivers...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send to {selectedDriverIds.size} Driver{selectedDriverIds.size > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DrawerContent className="px-4 pb-6">
          <DrawerHeader className="px-0">
            <DrawerTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Send SMS to Driver
            </DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Send SMS to Driver
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};
