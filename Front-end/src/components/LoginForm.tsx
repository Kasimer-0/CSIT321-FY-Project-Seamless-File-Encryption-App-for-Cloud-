import { apiFetch, setAuthToken } from "../lib/api"
import { useState, useRef } from "react"
import type { UserAccount } from "../Type"

type LoginFormProps = {
    onLogin: (user: UserAccount) => void
}

function LoginForm({ onLogin }: LoginFormProps) {
    const [usernameOrEmail, setUsernameOrEmail] = useState("")
    const [password, setPassword] = useState("")
    
    // Array of 6 elements to manage each word separately
    const [recoveryWords, setRecoveryWords] = useState<string[]>(Array(6).fill(""))
    const [useRecovery, setUseRecovery] = useState(false)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    // References to cleanly manage auto-focusing between the word boxes
    const inputRefs = useRef<HTMLInputElement[]>([])

    const handleWordChange = (index: number, value: string) => {
        // Allow full words to be typed or pasted
        const cleanValue = value.trim().toLowerCase()
        const updatedWords = [...recoveryWords]
        updatedWords[index] = cleanValue
        setRecoveryWords(updatedWords)
    }

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        // Hop forward to the next box if pressing Space or Enter after typing a word
        if ((e.key === " " || e.key === "Enter") && recoveryWords[index] && index < 5) {
            e.preventDefault()
            inputRefs.current[index + 1]?.focus()
        }
        // Auto-focus backward to previous word box if pressing Backspace on an empty input
        if (e.key === "Backspace" && !recoveryWords[index] && index > 0) {
            inputRefs.current[index - 1]?.focus()
        }
    }

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

    const handleRecoveryLogin = async () => {
        setError("")
        
        // Ensure all 6 boxes are completed
        if (recoveryWords.some(word => !word)) {
            setError("Please fill out all 6 recovery words.")
            return
        }

        setLoading(true)
        // Join the array together with spaces to conform to your backend signature structure
        const fullRecoveryPhrase = recoveryWords.join(" ")

        try {
            const response = await apiFetch("http://localhost:8080/account/recovery-phrase/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ usernameOrEmail, recoveryPhrase: fullRecoveryPhrase })
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

            {/* Step 1: Username / Email */}
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

            {/* Step 2: Verification (Password or Split 6-Word Layout) */}
            {!useRecovery ? (
                <div className="form-group-custom mb-4">
                    <label className="input-label">Password</label>
                    <input
                        className="form-control"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
            ) : (
                <div className="form-group-custom mb-4">
                    <label className="input-label">6-Word Security Recovery Phrase</label>
                    
                    {/* Grid containing 2 rows of 3 columns */}
                    <div className="row g-2">
                        {recoveryWords.map((word, index) => (
                            <div className="col-4" key={index}>
                                <div className="position-relative d-flex align-items-center">
                                    <span style={{
                                        position: "absolute",
                                        left: "10px",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        color: "#4b5563",
                                        zIndex: 5
                                    }}>
                                        {index + 1}
                                    </span>
                                    <input
                                        ref={(el) => { if (el) inputRefs.current[index] = el }}
                                        className="form-control text-start"
                                        style={{ 
                                            fontSize: "13px", 
                                            paddingLeft: "26px",
                                            borderColor: word ? "#06b6d4" : "#1f1f23"
                                        }}
                                        type="text"
                                        placeholder="word"
                                        value={word}
                                        onChange={(e) => handleWordChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Action Buttons styled natively to match your main button system */}
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
                    style={{
                        background: "none",
                        border: "none",
                        color: "#06b6d4",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "color 0.15s ease"
                    }}
                    onClick={() => {
                        setUseRecovery(v => !v)
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
