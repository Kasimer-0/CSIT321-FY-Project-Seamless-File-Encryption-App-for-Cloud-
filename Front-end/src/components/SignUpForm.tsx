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

        //Check empty fields
        if (!username || !email || !password || !confirmPassword || !dob) {
            setMessage("Please fill in all fields")
            setMessageType("error")
            return
        }

        //check valid Email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            setMessage("Invalid email format")
            setMessageType("error")
            return
        }

        //Ensure password strength
        const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
        if (!strongPassword.test(password)) {
            setMessage(
                "Password must contain uppercase, lowercase, number, and at least 8 characters"
            )
            setMessageType("error")
            return
        }

        //Confirm password
        if (password !== confirmPassword) {
            setMessage("Passwords do not match")
            setMessageType("error")
            return
        }

        try {
            const response = await apiFetch("http://localhost:8080/signup", {
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
        <h2 className="mb-3 text-center">Sign Up</h2>


        <div style={{ minHeight: "60px" }}>
            {message && (
            <div
                className={`alert py-2 ${
                messageType === "error" ? "alert-danger" : "alert-success"}`}>
                {message}
          </div>
            )}
        </div>

        <input
            className="form-control mb-3"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
        />

        <input
            className="form-control mb-3"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
        />

        <input
            className="form-control mb-3"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
        />

        <input
            className="form-control mb-3"
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <input
            className="form-control mb-3"
            type="date"
            placeholder="DOB"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
        />

        <button
            className="btn btn-primary w-100"
            onClick={handleSignup}
        >
            Sign Up
        </button>
        </>
    )
}

export default SignUpForm