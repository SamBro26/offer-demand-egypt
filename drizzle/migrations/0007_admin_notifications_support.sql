CREATE TABLE public.system_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_notifications TO authenticated;
GRANT ALL ON public.system_notifications TO service_role;
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read notifications" ON public.system_notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins send notifications" ON public.system_notifications FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());
GRANT INSERT ON public.system_notifications TO authenticated;

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  sender_email text,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users send own support messages" ON public.support_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND NOT public.is_banned(auth.uid()));
CREATE POLICY "Users read own support messages" ON public.support_messages FOR SELECT TO authenticated USING (sender_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));