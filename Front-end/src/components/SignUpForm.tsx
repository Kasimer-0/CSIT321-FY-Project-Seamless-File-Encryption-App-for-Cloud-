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

        // Check empty fields
        if (!username || !email || !password || !confirmPassword || !dob) {
            setMessage("Please fill in all fields")
            setMessageType("error")
            return
        }

        // Check valid Email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            setMessage("Invalid email format")
            setMessageType("error")
            return
        }

        // Ensure password strength
        const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
        if (!strongPassword.test(password)) {
            setMessage(
                "Password must contain uppercase, lowercase, number, and at least 8 characters"
            )
            setMessageType("error")
            return
        }

        // Confirm password
        if (password !== confirmPassword) {
            setMessage("Passwords do not match")
            setMessageType("error")
            return
        }

        try {
            const response = await fetch("http://localhost:8080/signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    dob
                })
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

        } catch (error) {
            setMessage("Server connection failed")
            setMessageType("error")
        }
    }

    return (
        <>
            <h2 className="form-title">Create Account</h2>
            <p className="form-subtitle">Join StealthSync to use our services.</p>

            {/* Premium Inline Status Message Banner */}
            <div className="status-message-container">
                {message && (
                    <div className={`status-banner ${messageType === "error" ? "status-error" : "status-success"}`}>
                        <span className="status-indicator-dot"></span>
                        <span className="status-text">{message}</span>
                    </div>
                )}
            </div>

            <div className="form-group-custom">
                <label className="input-label">Username</label>
                <input
                    className="form-control"
                    placeholder="Enter unique username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
            </div>

            <div className="form-group-custom">
                <label className="input-label">Email Address</label>
                <input
                    className="form-control"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>

            <div className="form-group-custom">
                <label className="input-label">Password</label>
                <input
                    className="form-control"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>

            <div className="form-group-custom">
                <label className="input-label">Confirm Password</label>
                <input
                    className="form-control"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                />
            </div>

            <div className="form-group-custom mb-4">
                <label className="input-label">Date of Birth</label>
                <input
                    className="form-control"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                />
            </div>

            <button
                className="btn-premium-action"
                onClick={handleSignup}
            >
                Register Credentials
            </button>
        </>
    )
}

export default SignUpForm