/** Ambient sky/indigo light blobs behind the frosted-glass panels. */
export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-sky-accent/20 via-brand/5 to-background" />
      <div className="absolute -top-24 -right-16 size-72 rounded-full bg-sky-accent/30 blur-3xl" />
      <div className="absolute top-40 -left-20 size-64 rounded-full bg-brand/20 blur-3xl" />
      <div className="absolute bottom-0 right-10 size-56 rounded-full bg-sky-accent/25 blur-3xl" />
    </div>
  );
}
