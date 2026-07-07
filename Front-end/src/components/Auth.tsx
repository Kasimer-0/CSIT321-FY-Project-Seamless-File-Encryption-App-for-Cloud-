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
        <main className="auth-viewport-wrapper">
            <section className="auth-stage">
                <div className="auth-branding-header">
                    <div className="auth-brand-kicker">Encrypted cloud access</div>
                    <h1 className="auth-brand-title">STEALTHSYNC</h1>
                    <p className="auth-brand-subtitle mb-0">Root level console for protected file exchange.</p>
                </div>

                <div className="auth-card-expanded">
                    <div className="auth-tab-group" role="tablist" aria-label="Authentication mode">
                        <button
                            className={`auth-tab-button ${tab === "login" ? "active" : ""}`}
                            type="button"
                            onClick={() => setTab("login")}
                        >
                            Login
                        </button>
                        <button
                            className={`auth-tab-button ${tab === "signup" ? "active" : ""}`}
                            type="button"
                            onClick={() => setTab("signup")}
                        >
                            Sign Up
                        </button>
                    </div>
                    <div className="auth-card-inner">
                        {tab === "login" ? <LoginForm onLogin={onLogin} /> : <SignUpForm />}
                    </div>
                </div>
            </section>
        </main>
    )
}

export default Auth
