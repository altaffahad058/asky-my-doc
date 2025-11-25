type HomeHeaderProps = {
  loggingOut: boolean;
  onLogout: (e: React.FormEvent) => Promise<void> | void;
};

export function HomeHeader({ loggingOut, onLogout }: HomeHeaderProps) {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
          A
        </div>
        <div>
          <p className="text-base font-semibold">
            AskMyDocs: AI-Powered Knowledge Explorer
          </p>
          <p className="muted">Ask questions about your documents</p>
        </div>
      </div>
      <form onSubmit={onLogout}>
        <button
          className="button cursor-pointer"
          type="submit"
          disabled={loggingOut}
        >
          {loggingOut ? "Logging out…" : "Log out"}
        </button>
      </form>
    </header>
  );
}

