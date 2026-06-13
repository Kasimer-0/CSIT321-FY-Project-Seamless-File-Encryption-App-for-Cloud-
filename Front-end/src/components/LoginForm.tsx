import { useState } from "react"
import type { UserAccount } from "../Type"

type LoginFormProps = {
    onLogin: (user: UserAccount) => void
}

function LoginForm({ onLogin }: LoginFormProps) {
    const [usernameOrEmail, setUsernameOrEmail] = useState("")
    const [password, setPassword] = useState("")
    // Codex integration note: recovery login is an alternate credential flow from the security user story.
    // It is kept inside the existing login form to preserve the teammate's original page structure.
    const [recoveryPhrase, setRecoveryPhrase] = useState("")
    const [useRecovery, setUseRecovery] = useState(false)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleLogin = async () => {
        setError("")
        setLoading(true)

        try {
            const response = await fetch("http://localhost:8080/login", {
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
            const response = await fetch("http://localhost:8080/account/recovery-phrase/login", {
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

            onLogin(data.user)
        } catch (err) {
            setError("Server connection failed")
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <h2 className="mb-3 text-center">Login</h2>

            <div className="mb-3" style={{ minHeight: "30px" }}>
                {error && (
                    <div className="alert alert-danger mb-0 py-2">
                        {error}
                    </div>
                )}
            </div>

            <input
                className="form-control mb-3"
                type="text"
                placeholder="Username/Email address"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
            />

            {useRecovery ? (
                <input
                    className="form-control mb-3"
                    type="text"
                    placeholder="Recovery phrase"
                    value={recoveryPhrase}
                    onChange={(e) => setRecoveryPhrase(e.target.value)}
                />
            ) : (
                <input
                    className="form-control mb-3"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            )}

            <button
                className="btn btn-primary w-100"
                onClick={useRecovery ? handleRecoveryLogin : handleLogin}
                disabled={loading}
            >
                {loading ? "Logging in..." : useRecovery ? "Login with Recovery Phrase" : "Login"}
            </button>

            <button
                className="btn btn-link w-100 mt-2"
                type="button"
                onClick={() => {
                    setUseRecovery(v => !v)
                    setError("")
                }}
            >
                {useRecovery ? "Use password login" : "Use recovery phrase"}
            </button>
        </>
    )
}

export default LoginForm
