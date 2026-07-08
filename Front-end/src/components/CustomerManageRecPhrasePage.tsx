import { useState } from "react"
import type { UserAccount } from "../Type"
import { apiFetch } from "../lib/api"

type Props = {
    user: UserAccount
}

function CustomerManageRecPhrase({ user }: Props) {
    const premium = user.isSubscribed

    const [recoveryWords, setRecoveryWords] = useState<string[] | null>(null)
    const [isRevealed, setIsRevealed] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [localBanner, setLocalBanner] = useState<{ msg: string; type: "success" | "error" } | null>(null)

    const triggerBanner = (msg: string, type: "success" | "error") => {
        setLocalBanner({ msg, type })
        setTimeout(() => setLocalBanner(null), 4000)
    }

    const handleGeneratePhrase = async () => {
        if (recoveryWords) {
            triggerBanner("Recovery phrase has already been initialized for this session.", "error")
            return
        }

        setIsGenerating(true)
        setLocalBanner(null)

        try {
            // Recovery phrases must be generated and hashed by the backend; this
            // avoids storing a caller-supplied phrase through an unprotected route.
            const response = await apiFetch("http://localhost:8080/account/recovery-phrase/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({})
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.message || "Recovery phrase persistence layer rejected transaction.")
            }

            const data: { recoveryPhrase: string } = await response.json()
            const generatedPool = data.recoveryPhrase.split(/[-\s]+/).map(word => word.toUpperCase())
            setRecoveryWords(generatedPool)
            setIsRevealed(true)
            triggerBanner("SUCCESS: Recovery phrase committed to account vault.", "success")
        } catch (error) {
            triggerBanner(error instanceof Error ? `DATABASE_ERROR: ${error.message}` : "DATABASE_ERROR: Failed to commit phrase.", "error")
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="premium-metric-card-wrapper border rounded p-4 text-white" style={{ backgroundColor: "#141417", borderColor: "#27272a" }}>
            <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-4" style={{ borderColor: "#27272a" }}>
                <div>
                    <h3 className="fw-semibold mb-1 text-white" style={{ fontSize: "20px" }}>Master Recovery Phrase</h3>
                    <p className="small mb-0" style={{ color: "#a1a1aa", fontSize: "14px" }}>High-entropy database authentication backup indices designed to replace normal password login layers.</p>
                </div>

                {premium && recoveryWords && (
                    <div className="d-inline-flex gap-2">
                        <button
                            className="btn fw-semibold text-white px-3 py-2 font-monospace"
                            style={{ backgroundColor: "#27272a", border: "1px solid #3f3f46", fontSize: "13px", borderRadius: "6px" }}
                            onClick={() => setIsRevealed(!isRevealed)}
                        >
                            {isRevealed ? "Hide Sequence" : "Reveal Sequence"}
                        </button>
                        <button
                            className="btn fw-semibold text-dark px-3 py-2"
                            style={{ backgroundColor: "#06b6d4", border: "none", fontSize: "13px", borderRadius: "6px" }}
                            onClick={() => navigator.clipboard.writeText(recoveryWords.join("-").toLowerCase())}
                        >
                            Copy Sequence
                        </button>
                    </div>
                )}
            </div>

            {localBanner && (
                <div className="p-3 mb-4 rounded border" style={{ color: localBanner.type === "error" ? "#f43f5e" : "#10b981", borderColor: "currentColor" }}>
                    {localBanner.msg}
                </div>
            )}

            {!premium ? (
                <div className="text-center py-5 rounded border border-dashed" style={{ color: "#a1a1aa" }}>
                    Recovery key compliance interfaces require premium account credentials.
                </div>
            ) : !recoveryWords ? (
                <div className="text-center py-5 my-3 rounded border" style={{ backgroundColor: "#0b0c10", borderColor: "#27272a" }}>
                    <h5 className="fw-semibold text-white mb-2">No Password Alternative Registered</h5>
                    <p className="small text-muted mx-auto mb-4" style={{ maxWidth: "420px" }}>
                        Click below to generate and store a 6-word recovery phrase for this account.
                    </p>
                    <button
                        className="btn border-0 fw-semibold text-dark px-4 py-2.5"
                        style={{ backgroundColor: "#06b6d4", borderRadius: "6px" }}
                        disabled={isGenerating}
                        onClick={handleGeneratePhrase}
                    >
                        {isGenerating ? "Compiling Cryptographic Indices..." : "Generate & Save Master Phrase"}
                    </button>
                </div>
            ) : (
                <div className="w-100 py-2">
                    <div className="row g-3">
                        {recoveryWords.map((word, index) => (
                            <div key={index} className="col-12 col-md-4">
                                <div className="p-4 rounded border position-relative" style={{ backgroundColor: "#0b0c10", borderColor: "#27272a", minHeight: "110px" }}>
                                    <div className="position-absolute font-monospace" style={{ top: "12px", left: "16px", fontSize: "11px", color: "#52525b" }}>
                                        WORD 0{index + 1}
                                    </div>
                                    <div className="w-100 text-center font-monospace mt-2" style={{ fontSize: "20px" }}>
                                        {isRevealed ? word : "******"}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default CustomerManageRecPhrase
