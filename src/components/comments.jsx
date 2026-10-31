// Comments on a session (backend app/api/inbox.py): the patient and their linked clinician, nobody else.
import { useEffect, useState } from "react";
import { PaperPlaneRight } from "@phosphor-icons/react";
import { api, errorMessage, formatDate } from "@/api/client";
import { LoadError } from "@/components/states";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function CommentThread({ sessionId }) {
  const [comments, setComments] = useState(null);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  const load = () => {
    setFailed(false);
    api
      .comments(sessionId)
      .then(setComments)
      .catch(() => setFailed(true));
  };
  useEffect(load, [sessionId]);

  const send = async (e) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const c = await api.addComment(sessionId, draft.trim());
      setComments((prev) => [...(prev ?? []), c]);
      setDraft("");
    } catch (err) {
      setError(errorMessage(err, "Couldn't send the comment. Please try again."));
    }
    setSending(false);
  };

  return (
    <Card role="region" aria-label="Comments">
      <CardHeader>
        <CardTitle>Comments</CardTitle>
        <CardDescription>Seen only by you and the clinicians you've linked with.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {failed && <LoadError message="Couldn't load the comments." onRetry={load} />}
        {comments?.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
        {comments?.length > 0 && (
          <ol className="flex flex-col gap-3">
            {comments.map((c) => (
              <li
                key={c.id}
                className={cn(
                  "max-w-[85%] rounded-lg border px-4 py-3 text-sm",
                  c.mine ? "self-end bg-primary-soft" : "self-start bg-surface",
                )}
              >
                <div className="mb-1 text-xs text-muted-foreground">
                  {c.mine
                    ? "You"
                    : c.author_name || (c.author_role === "clinician" ? "Your clinician" : "Patient")}
                  {c.created_at && ` · ${formatDate(c.created_at)}`}
                </div>
                <p className="whitespace-pre-wrap">{c.body}</p>
              </li>
            ))}
          </ol>
        )}
        {error && <Alert variant="destructive">{error}</Alert>}
        <form onSubmit={send} className="flex flex-col gap-2">
          <label htmlFor={`comment-${sessionId}`} className="text-sm font-medium">
            Add a comment
          </label>
          <Textarea
            id={`comment-${sessionId}`}
            maxLength={2000}
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button type="submit" size="sm" className="self-end" disabled={!draft.trim() || sending}>
            <PaperPlaneRight aria-hidden />
            {sending ? "Sending…" : "Send"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
