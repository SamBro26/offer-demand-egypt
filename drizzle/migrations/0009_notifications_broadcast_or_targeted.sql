DROP POLICY IF EXISTS "Users read own notifications" ON public.system_notifications;
CREATE POLICY "Users read own or broadcast notifications" ON public.system_notifications
FOR SELECT TO authenticated USING (recipient_id IS NULL OR recipient_id = auth.uid());
CREATE INDEX IF NOT EXISTS system_notifications_recipient_idx ON public.system_notifications (recipient_id, created_at DESC);
COMMENT ON COLUMN public.system_notifications.recipient_id IS 'NULL = broadcast to all users; otherwise targeted to this user';