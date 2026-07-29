import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, X, ListChecks } from "lucide-react";

export interface SurveyQuestion {
  id: string;
  question: string;
  options: string[];
  is_active: boolean;
  sort_order: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

export const ManageSurveyQuestionsDialog = ({ open, onOpenChange, onChanged }: Props) => {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState<string[]>(["", ""]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("survey_questions")
      .select("id, question, options, is_active, sort_order")
      .order("sort_order", { ascending: true });
    if (error) toast.error("Failed to load survey questions.");
    else
      setQuestions(
        (data || []).map((q: any) => ({ ...q, options: Array.isArray(q.options) ? q.options : [] }))
      );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) fetchQuestions();
  }, [open, fetchQuestions]);

  const handleAdd = async () => {
    const q = newQuestion.trim();
    const opts = newOptions.map((o) => o.trim()).filter(Boolean);
    if (!q) return toast.error("Enter a question.");
    if (opts.length < 2) return toast.error("Add at least two options.");
    setSaving(true);
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase.from("survey_questions").insert({
      question: q,
      options: opts,
      sort_order: (questions[questions.length - 1]?.sort_order || 0) + 1,
      created_by: authData?.user?.id ?? null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Survey question added.");
    setNewQuestion("");
    setNewOptions(["", ""]);
    await fetchQuestions();
    onChanged?.();
  };

  const handleToggle = async (q: SurveyQuestion) => {
    const { error } = await supabase
      .from("survey_questions")
      .update({ is_active: !q.is_active })
      .eq("id", q.id);
    if (error) return toast.error(error.message);
    await fetchQuestions();
    onChanged?.();
  };

  const handleDelete = async (q: SurveyQuestion) => {
    if (!confirm(`Delete "${q.question}"? Existing submissions are kept.`)) return;
    const { error } = await supabase.from("survey_questions").delete().eq("id", q.id);
    if (error) return toast.error(error.message);
    toast.success("Question deleted.");
    await fetchQuestions();
    onChanged?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" /> Survey Questions
          </DialogTitle>
          <DialogDescription>
            Create survey questions and their selectable options. Only active questions are shown to drivers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : questions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No survey questions yet.</p>
          ) : (
            questions.map((q) => (
              <div key={q.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm">{q.question}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={q.is_active} onCheckedChange={() => handleToggle(q)} />
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(q)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <ul className="text-xs text-muted-foreground list-disc pl-5">
                  {q.options.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="rounded-lg border p-3 space-y-3">
          <p className="text-sm font-semibold">Add New Question</p>
          <Input
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="e.g. Cashier Timings"
          />
          <div className="space-y-2">
            {newOptions.map((opt, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  value={opt}
                  onChange={(e) =>
                    setNewOptions((prev) => prev.map((o, i) => (i === idx ? e.target.value : o)))
                  }
                  placeholder={`Option ${idx + 1}`}
                />
                {newOptions.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setNewOptions((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setNewOptions((p) => [...p, ""])}>
              <Plus className="h-4 w-4 mr-1" /> Add Option
            </Button>
          </div>
          <Button onClick={handleAdd} disabled={saving} className="w-full">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save Question
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};