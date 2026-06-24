import { useState } from "react"
import type { UserAccount } from "../Type"

type LoginFormProps = {
    onLogin: (user: UserAccount) => void
}

function LoginForm({ onLogin }: LoginFormProps) {
    const [usernameOrEmail, setUsernameOrEmail] = useState("")
    const [password, setPassword] = useState("")
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
            <h2 className="form-title">Welcome Back</h2>
            <p className="form-subtitle">Login to access StealthSync's Services.</p>

            {/* Inline Error Message Module */}
            <div className="status-message-container">
                {error && (
                    <div className="status-banner status-error">
                        <span className="status-indicator-dot"></span>
                        <span className="status-text">{error}</span>
                    </div>
                )}
            </div>

            <div className="form-group-custom">
                <label className="input-label">Username or Email</label>
                <input
                    className="form-control"
                    type="text"
                    placeholder="Username or email address"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                />
            </div>

            <div className="form-group-custom mb-4">
                <div className="d-flex justify-content-between align-items-center">
                    <label className="input-label">
                        {useRecovery ? "Recovery Phrase" : "Password"}
                    </label>
                </div>
                
                {useRecovery ? (
                    <input
                        className="form-control"
                        type="text"
                        placeholder="Enter your 6-word Phrase"
                        value={recoveryPhrase}
                        onChange={(e) => setRecoveryPhrase(e.target.value)}
                    />
                ) : (
                    <input
                        className="form-control"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                )}
            </div>

            <button
                className="btn-premium-action"
                onClick={useRecovery ? handleRecoveryLogin : handleLogin}
                disabled={loading}
            >
                {loading ? "Authenticating..." : useRecovery ? "Log In via Recovery Phrase" : "Log In"}
            </button>

            <div className="text-center mt-3">
                <button
                    className="btn-premium-toggle"
                    type="button"
                    onClick={() => {
                        setUseRecovery(v => !v)
                        setError("")
                    }}
                >
                    {useRecovery ? "Log In via Password" : "Log In via Recovery Phrase"}
                </button>
            </div>
        </>
    )
}

export default LoginForm