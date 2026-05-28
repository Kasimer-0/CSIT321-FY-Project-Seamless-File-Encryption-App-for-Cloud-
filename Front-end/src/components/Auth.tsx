import { useState } from "react"
import LoginForm from "./LoginForm"
import SignUpForm from "./SignUpForm"
import type { UserAccount } from "../Type"

type AuthProps = {
    onLogin: (user: UserAccount) => void
}

function Auth({ onLogin }: AuthProps) {
    const [tab, setTab] = useState("login")

    return (
        <div className="container vh-100 d-flex justify-content-center align-items-center">
            <div className="card p-4" style={{ width: "400px" }}>
                <div className="d-flex mb-3">
                    <button
                        className={`btn w-50 ${tab === "login" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => setTab("login")}
                    >
                        Login
                    </button>
                    <button
                        className={`btn w-50 ms-2 ${tab === "signup" ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => setTab("signup")}
                    >
                        Sign Up
                    </button>
                </div>
                {tab === "login" ? <LoginForm onLogin={onLogin} /> : <SignUpForm />}
            </div>
        </div>
    )
}

export default Auth