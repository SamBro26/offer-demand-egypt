CREATE OR REPLACE FUNCTION public.has_listing_conversation(
  _listing_id uuid,
  _first_user uuid,
  _second_user uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.messages
    WHERE listing_id = _listing_id
      AND (
        (sender_id = _first_user AND recipient_id = _second_user)
        OR (sender_id = _second_user AND recipient_id = _first_user)
      )
  )
$$;

REVOKE ALL ON FUNCTION public.has_listing_conversation(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_listing_conversation(uuid, uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "send to listing participant" ON public.messages;
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
    OR public.has_listing_conversation(messages.listing_id, messages.sender_id, messages.recipient_id)
  )
);