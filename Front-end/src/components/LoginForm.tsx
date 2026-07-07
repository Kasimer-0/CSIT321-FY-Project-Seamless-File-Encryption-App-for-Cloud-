import { apiFetch, setAuthToken } from "../lib/api"
import { useState } from "react"
import type { UserAccount } from "../Type"

type LoginFormProps = {
    onLogin: (user: UserAccount) => void
}

function LoginForm({ onLogin }: LoginFormProps) {
    const [usernameOrEmail, setUsernameOrEmail] = useState("")
    const [password, setPassword] = useState("")
    // Recovery login is an alternate credential flow from the security user story.
    // It stays inside the existing login form to preserve the page structure.
    const [recoveryPhrase, setRecoveryPhrase] = useState("")
    const [useRecovery, setUseRecovery] = useState(false)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleLogin = async () => {
        setError("")
        setLoading(true)

        try {
            const response = await apiFetch("http://localhost:8080/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ usernameOrEmail, password })
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.message || "Invalid credentials")
                return
            }

            if (data.user.isSuspended) {
                setError("Your account has been suspended. Please contact support.")
                return
            }

            setAuthToken(data.token)
            onLogin(data.user)

        } catch (err) {
            setError("Server connection failed")
        } finally {
            setLoading(false)
        }
    }

    // Recovery phrases are sent to their dedicated endpoint and never mixed with password login.
    const handleRecoveryLogin = async () => {
        setError("")
        setLoading(true)

        try {
            const response = await apiFetch("http://localhost:8080/account/recovery-phrase/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ usernameOrEmail, recoveryPhrase })
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.message || "Invalid recovery phrase")
                return
            }

            setAuthToken(data.token)
            onLogin(data.user)
        } catch (err) {
            setError("Server connection failed")
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <div className="mb-4">
                <div className="console-kicker">Identity check</div>
                <h2 className="form-title">Console Login</h2>
                <p className="form-subtitle mb-0">Authenticate before opening encrypted file operations.</p>
            </div>

            <div style={{ minHeight: "52px" }}>
                {error && (
                    <div className="status-banner error" role="alert">
                        {error}
                    </div>
                )}
            </div>

            <div className="form-group-custom">
                <label className="input-label" htmlFor="usernameOrEmail">Username or email</label>
                <input
                    id="usernameOrEmail"
                    className="form-control form-control-lg"
                    type="text"
                    placeholder="testuser or testuser@stealthsync.com"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                />
            </div>

            {useRecovery ? (
                <div className="form-group-custom">
                    <label className="input-label" htmlFor="recoveryPhrase">Recovery phrase</label>
                    <input
                        id="recoveryPhrase"
                        className="form-control form-control-lg"
                        type="text"
                        placeholder="Enter recovery phrase"
                        value={recoveryPhrase}
                        onChange={(e) => setRecoveryPhrase(e.target.value)}
                    />
                </div>
            ) : (
                <div className="form-group-custom">
                    <label className="input-label" htmlFor="password">Password</label>
                    <input
                        id="password"
                        className="form-control form-control-lg"
                        type="password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
            )}

            <button
                className="btn-premium-action"
                type="button"
                onClick={useRecovery ? handleRecoveryLogin : handleLogin}
                disabled={loading}
            >
                {loading ? "Authenticating..." : useRecovery ? "Login with Recovery Phrase" : "Login"}
            </button>

            <div className="auth-view-footer">
                <button
                    className="btn btn-link"
                    type="button"
                    onClick={() => {
                        setUseRecovery(v => !v)
                        setError("")
                    }}
                >
                    {useRecovery ? "Use password login" : "Use recovery phrase"}
                </button>
            </div>
        </>
    )
}

export default LoginForm
