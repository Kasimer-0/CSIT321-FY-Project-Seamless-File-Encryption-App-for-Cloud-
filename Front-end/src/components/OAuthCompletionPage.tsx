function OAuthCompletionPage() {
    const params = new URLSearchParams(window.location.search)
    const status = params.get("oauth") ?? "error"
    const provider = (params.get("provider") ?? "cloud provider").replaceAll("_", " ")
    const account = params.get("account")
    const connected = status === "connected"
    const cancelled = status === "cancelled"

    return <main className="auth-page d-flex align-items-center justify-content-center min-vh-100 p-4">
        <section className="card p-5 text-center" style={{ width: "min(560px, 100%)" }}>
            <div className="console-kicker mb-2">STEALTHSYNC DESKTOP</div>
            <h1 className="h3 mb-3">
                {connected ? "Authorization complete" : cancelled ? "Authorization cancelled" : "Authorization failed"}
            </h1>
            <p className="text-muted mb-2 text-capitalize">{provider}</p>
            {connected && account && <p className="mb-3">Connected as {account}</p>}
            <p className="text-muted mb-0">
                {connected
                    ? "You can close this browser tab and return to the StealthSync desktop app. It will refresh automatically."
                    : "Close this tab, return to StealthSync, and try the connection again."}
            </p>
        </section>
    </main>
}

export default OAuthCompletionPage
