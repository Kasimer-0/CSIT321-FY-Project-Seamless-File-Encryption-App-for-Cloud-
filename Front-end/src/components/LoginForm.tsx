import { apiFetch, setAuthToken } from "../lib/api"
import { useRef, useState, type KeyboardEvent } from "react"
import type { UserAccount } from "../Type"

type LoginFormProps = {
    onLogin: (user: UserAccount) => void
}

function LoginForm({ onLogin }: LoginFormProps) {
    const [usernameOrEmail, setUsernameOrEmail] = useState("")
    const [password, setPassword] = useState("")
    const [recoveryWords, setRecoveryWords] = useState<string[]>(Array(6).fill(""))
    const [useRecovery, setUseRecovery] = useState(false)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const inputRefs = useRef<HTMLInputElement[]>([])

    const handleWordChange = (index: number, value: string) => {
        const updatedWords = [...recoveryWords]
        updatedWords[index] = value.trim().toLowerCase()
        setRecoveryWords(updatedWords)
    }

    const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
        if ((event.key === " " || event.key === "Enter") && recoveryWords[index] && index < 5) {
            event.preventDefault()
            inputRefs.current[index + 1]?.focus()
        }
        if (event.key === "Backspace" && !recoveryWords[index] && index > 0) {
            inputRefs.current[index - 1]?.focus()
        }
    }

    // Standard login returns a JWT; storing it here lets apiFetch attach the
    // Authorization header to protected customer/admin requests after login.
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
        } catch {
            setError("Server connection failed")
        } finally {
            setLoading(false)
        }
    }

    const handleRecoveryLogin = async () => {
        setError("")
        if (recoveryWords.some(word => !word)) {
            setError("Please fill out all 6 recovery words.")
            return
        }

        setLoading(true)
        try {
            const response = await apiFetch("http://localhost:8080/account/recovery-phrase/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ usernameOrEmail, recoveryPhrase: recoveryWords.join(" ") })
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.message || "Invalid recovery phrase")
                return
            }

            setAuthToken(data.token)
            onLogin(data.user)
        } catch {
            setError("Server connection failed")
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <h2 className="form-title">Welcome Back</h2>
            <p className="form-subtitle">Login to access StealthSync services.</p>

            <div className="status-message-container">
                {error && (
                    <div className="status-banner status-error" role="alert">
                        <span className="status-indicator-dot"></span>
                        <span className="status-text">{error}</span>
                    </div>
                )}
            </div>

            <div className="form-group-custom">
                <label className="input-label" htmlFor="usernameOrEmail">Username or Email</label>
                <input
                    id="usernameOrEmail"
                    className="form-control"
                    type="text"
                    placeholder="Username or email address"
                    value={usernameOrEmail}
                    onChange={(event) => setUsernameOrEmail(event.target.value)}
                />
            </div>

            {!useRecovery ? (
                <div className="form-group-custom mb-4">
                    <label className="input-label" htmlFor="password">Password</label>
                    <input
                        id="password"
                        className="form-control"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </div>
            ) : (
                <div className="form-group-custom mb-4">
                    <label className="input-label">6-Word Security Recovery Phrase</label>
                    <div className="row g-2">
                        {recoveryWords.map((word, index) => (
                            <div className="col-4" key={index}>
                                <div className="position-relative d-flex align-items-center">
                                    <span className="recovery-word-index">{index + 1}</span>
                                    <input
                                        ref={(element) => { if (element) inputRefs.current[index] = element }}
                                        className="form-control text-start recovery-word-input"
                                        type="text"
                                        placeholder="word"
                                        value={word}
                                        onChange={(event) => handleWordChange(index, event.target.value)}
                                        onKeyDown={(event) => handleKeyDown(index, event)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <button
                className="btn-premium-action"
                type="button"
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
                        setUseRecovery(value => !value)
                        setError("")
                        setRecoveryWords(Array(6).fill(""))
                    }}
                >
                    {useRecovery ? "Log In via Password" : "Log In via Recovery Phrase"}
                </button>
            </div>
        </>
    )
}

export default LoginForm
