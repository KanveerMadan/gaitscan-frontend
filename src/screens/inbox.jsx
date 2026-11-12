// The clinician's inbox (backend GET /clinician/inbox): linked patients' recent sessions, newest
// first, marked new since the last visit. Opening the inbox marks it seen for next time.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { CaretRight, ChatCircle } from "@phosphor-icons/react";
import { api, formatDate } from "@/api/client";
import { EmptyState, LoadError } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/ui/skeleton";

export function InboxScreen() {
  const [inbox, setInbox] = useState(null);
  const [failed, setFailed] = useState(false);

  const load = async () => {
    setFailed(false);
    try {
      setInbox(await api.inbox());
      api.inboxSeen().catch(() => {}); // what's new now stays marked on this visit
    } catch {
      setFailed(true);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const items = inbox?.items ?? [];
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="text-sm text-muted-foreground">
          Your patients' sessions from the last 90 days, newest first.
        </p>
      </div>
      {failed && <LoadError message="Couldn't load your inbox." onRetry={load} />}
      {!inbox && !failed && <ListSkeleton label="Loading inbox" />}
      {inbox && items.length === 0 && (
        <EmptyState title="Nothing in your inbox yet.">
          New sessions from patients linked to you appear here.
        </EmptyState>
      )}
      {items.length > 0 && (
        <ul aria-label="Inbox" className="divide-y rounded-lg border bg-surface">
          {items.map((i) => (
            <li key={i.session_id}>
              <Link
                to={`/sessions/${i.session_id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {i.patient_name || "Patient"}
                    {i.new && <Badge>New</Badge>}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {formatDate(i.created_at)}
                    {i.cadence != null && ` · cadence ${i.cadence} steps/min`}
                  </span>
                </span>
                {i.comments > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ChatCircle aria-hidden /> {i.comments}
                  </span>
                )}
                <CaretRight className="shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
