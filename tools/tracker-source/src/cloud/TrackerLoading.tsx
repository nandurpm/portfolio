export function TrackerLoading({ failed = false }: { failed?: boolean }) {
  return (
    <main className="tracker-startup" aria-labelledby="tracker-loading-brand">
      <img src="./icon.svg" alt="" aria-hidden="true" width="64" height="64" />
      <strong id="tracker-loading-brand">Savings Tracker</strong>
      {!failed && <span className="tracker-startup-mark" aria-hidden="true" />}
      <p role={failed ? 'alert' : 'status'}>
        {failed
          ? 'We couldn’t load the tracker. Check your connection and try again.'
          : 'Loading your tracker…'}
      </p>
      {failed && (
        <button type="button" onClick={() => location.reload()}>
          Retry
        </button>
      )}
    </main>
  );
}
