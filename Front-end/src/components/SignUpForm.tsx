import { apiFetch } from "../lib/api"
import { useState } from "react"

function SignUpForm() {
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [dob, setDob] = useState("")
    const [message, setMessage] = useState("")
    const [messageType, setMessageType] = useState("")

    const handleSignup = async () => {
        setMessage("")
        setMessageType("")

        if (!username || !email || !password || !confirmPassword || !dob) {
            setMessage("Please fill in all fields")
            setMessageType("error")
            return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            setMessage("Invalid email format")
            setMessageType("error")
            return
        }

        const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
        if (!strongPassword.test(password)) {
            setMessage("Password must contain uppercase, lowercase, number, and at least 8 characters")
            setMessageType("error")
            return
        }

        if (password !== confirmPassword) {
            setMessage("Passwords do not match")
            setMessageType("error")
            return
        }

        try {
            const response = await apiFetch("/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password, dob })
            })

            const data = await response.json()

            if (!response.ok) {
                setMessage(data.message || "Invalid login credential")
                setMessageType("error")
                return
            }

            setMessage("Account created successfully")
            setMessageType("success")
            setUsername("")
            setEmail("")
            setPassword("")
            setConfirmPassword("")
            setDob("")
        } catch {
            setMessage("Server connection failed")
            setMessageType("error")
        }
    }

    return (
        <>
            <h2 className="form-title">Create Account</h2>
            <p className="form-subtitle">Join StealthSync to use protected cloud encryption.</p>

            <div className="status-message-container">
                {message && (
                    <div className={`status-banner ${messageType === "error" ? "status-error" : "status-success"}`}>
                        <span className="status-indicator-dot"></span>
                        <span className="status-text">{message}</span>
                    </div>
                )}
            </div>

            <div className="form-group-custom">
                <label className="input-label" htmlFor="signupUsername">Username</label>
                <input
                    id="signupUsername"
                    className="form-control"
                    placeholder="Enter unique username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                />
            </div>

            <div className="form-group-custom">
                <label className="input-label" htmlFor="signupEmail">Email Address</label>
                <input
                    id="signupEmail"
                    className="form-control"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                />
            </div>

            <div className="form-group-custom">
                <label className="input-label" htmlFor="signupPassword">Password</label>
                <input
                    id="signupPassword"
                    className="form-control"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                />
            </div>

            <div className="form-group-custom">
                <label className="input-label" htmlFor="signupConfirmPassword">Confirm Password</label>
                <input
                    id="signupConfirmPassword"
                    className="form-control"
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                />
            </div>

            <div className="form-group-custom mb-4">
                <label className="input-label" htmlFor="signupDob">Date of Birth</label>
                <input
                    id="signupDob"
                    className="form-control"
                    type="date"
                    value={dob}
                    onChange={(event) => setDob(event.target.value)}
                />
            </div>

            <button className="btn-premium-action" type="button" onClick={handleSignup}>
                Register Credentials
            </button>
        </>
    )
}

export default SignUpForm
