<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Listing photos live in the private `listing-photos` bucket under `<user_id>/`; `listings.images` stores paths resolved via signed URLs — public buckets are blocked on this project.
- Inbox conversations are derived from messages grouped by listing plus counterparty; this avoids duplicating conversation state while preserving per-listing threads.
