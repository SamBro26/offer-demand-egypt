# Inbox and advertising spaces

## What will be added
- Add a fourth bottom navigation destination, **Inbox**, with an unread indicator when new messages arrive.
- Build a signed-in inbox that groups messages into conversations by property and participant, ordered by the latest activity.
- Let users open a conversation, review its message history, and reply without leaving the inbox.
- Show a clear sign-in prompt when a visitor opens the inbox without an account.
- Reserve a fixed-height, clearly labeled **Advertisement Space - Google AdMob** area at the bottom of the home, browse results, and property details screens.
- Keep advertising below page content and above fixed navigation/contact controls so nothing overlaps.

## Technical details
- Extend the messaging data with read timestamps and indexes so unread counts and conversation ordering remain efficient.
- Tighten message insertion rules so senders can only message the property owner or reply to an existing participant.
- Use the existing private listing-photo flow for inbox thumbnails and the existing polling approach for message updates.
- Treat the current home results area as the browse listings screen because browsing and filtering currently share the `/` screen.
- Add unique metadata for the new inbox route and verify signed-out, mobile, and desktop layouts.
