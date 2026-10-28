import { useState } from "react";
import { api, errorMessage } from "@/api/client";
import { useAuth } from "@/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ChangePasswordForm() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ current_password: "", new_password: "" });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await api.changePassword(form);
      // The change ends every other login; this session continues with the token issued after it.
      if (res?.access_token) login({ ...user, token: res.access_token });
      setStatus({ ok: true, msg: res?.message || "Password changed." });
      setForm({ current_password: "", new_password: "" });
    } catch (err) {
      setStatus({ ok: false, msg: errorMessage(err, "Could not change the password. Please try again.") });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor="current-password">Current password</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={form.current_password}
            onChange={(e) => setForm({ ...form, current_password: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 10 characters"
            value={form.new_password}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Updating…" : "Update password"}
        </Button>
      </div>
      {status && (
        <p role="status" className={cn("text-sm", status.ok ? "text-primary" : "text-destructive")}>
          {status.msg}
        </p>
      )}
    </form>
  );
}
