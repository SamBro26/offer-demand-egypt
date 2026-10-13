ALTER TABLE public.system_notifications ADD COLUMN recipient_id uuid;

DROP POLICY "Signed-in users read notifications" ON public.system_notifications;

CREATE POLICY "Users read own notifications"
ON public.system_notifications
FOR SELECT TO authenticated
USING (auth.uid() = recipient_id);