ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

CREATE INDEX IF NOT EXISTS messages_participants_created_idx
  ON public.messages(sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_recipient_unread_idx
  ON public.messages(recipient_id, created_at DESC)
  WHERE read_at IS NULL;

GRANT UPDATE (read_at) ON public.messages TO authenticated;

CREATE POLICY "recipients mark messages read"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "send as self" ON public.messages;
CREATE POLICY "send to listing participant"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND recipient_id IS NOT NULL
  AND recipient_id <> sender_id
  AND (
    EXISTS (
      SELECT 1
      FROM public.listings
      WHERE listings.id = messages.listing_id
        AND listings.owner_id = messages.recipient_id
        AND listings.status = 'published'
    )
    OR EXISTS (
      SELECT 1
      FROM public.messages prior
      WHERE prior.listing_id = messages.listing_id
        AND (
          (prior.sender_id = messages.sender_id AND prior.recipient_id = messages.recipient_id)
          OR (prior.sender_id = messages.recipient_id AND prior.recipient_id = messages.sender_id)
        )
    )
  )
);