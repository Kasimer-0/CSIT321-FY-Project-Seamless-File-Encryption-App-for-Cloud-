import { useState } from "react"
import LoginForm from "./LoginForm"
import SignUpForm from "./SignUpForm"
import type { UserAccount } from "../Type"

type AuthProps = {
    onLogin: (user: UserAccount) => void
}

function Auth({ onLogin }: AuthProps) {
    const [isLoginView, setIsLoginView] = useState(true)

    return (
        <div className="auth-viewport-wrapper">
            <div className="auth-branding-header">
                <h1 className="auth-brand-name">STEALTH<span>SYNC</span></h1>
            </div>

            <div className="auth-card-expanded">
                {isLoginView ? (
                    <>
                        <LoginForm onLogin={onLogin} />
                        <div className="auth-view-footer">
                            <span>New to StealthSync?</span>
                            <button type="button" onClick={() => setIsLoginView(false)}>
                                Create a new Account
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <SignUpForm />
                        <div className="auth-view-footer">
                            <span>Have an account?</span>
                            <button type="button" onClick={() => setIsLoginView(true)}>
                                Log In
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default Auth