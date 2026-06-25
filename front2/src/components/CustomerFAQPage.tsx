import { useState } from "react"
import type { UserAccount } from "../Type" // Adjust path to your type file

type Props = {
    user: UserAccount
}

type FAQItem = {
    id: number
    question: string
    answer: string
}

function CustomerFAQPage({ user }: Props) {    const [openId, setOpenId] = useState<number | null>(null)

    const faqData: FAQItem[] = [
        {
            id: 1,
            question: "SECURE_STORAGE: Where are my decrypted files stored?",
            answer: "Because this application runs via a JavaFX container wrapper, files cannot download securely through standard browser blob storage. Instead, the backend handles file streaming locally and saves the decrypted plaintext directly into your local machine's system 'Downloads' directory or temporary application cache index."
        },
        {
            id: 2,
            question: "CRYPTO_INTEGRITY: Which encryption algorithms are used?",
            answer: "StealthSync relies entirely on industry-standard AES-GCM (256-bit) authenticated encryption for primary data payload structures, ensuring data integrity and confidentiality against local manipulation vectors."
        },
        {
            id: 3,
            question: "HARDWARE_TOKEN: Why can't I access physical token configurations?",
            answer: "Advanced hardware security token synchronization keys, along with automated multi-phrase seed recovery features, are premium enterprise tier configurations. These modules are accessible exclusively to active premium subscriber accounts."
        },
        {
            id: 4,
            question: "CLOUD_METADATA: What happens if the Google Drive connection drops?",
            answer: "If the cloud gateway disconnects, remote directory indexing features will throw a GATEWAY_DISCONNECT alert flag. However, your pre-existing local legacy database storage index records remain locally cached and fully accessible offline."
        }
    ]

    const toggleAccordion = (id: number) => {
        setOpenId(openId === id ? null : id)
    }

    return (
        <div className="w-100 text-white animate-fade-in">
            {/* Header section */}
            <div className="border-bottom border-secondary pb-2 mb-4">
                <h5 className="workspace-section-heading mb-0 text-uppercase font-monospace tracking-wider text-cyan">
                    SYSTEM_DOCUMENTATION_&_FAQ
                </h5>
                <p className="text-muted font-monospace small mb-0">
                    KNOWLEDGE_BASE_CORE_AND_OPERATIONAL_TROUBLESHOOTING
                </p>
            </div>

            {/* Accordion Layout Matrix */}
            <div className="d-flex flex-column gap-3">
                {faqData.map((item) => {
                    const isOpen = openId === item.id
                    return (
                        <div 
                            key={item.id} 
                            className="border border-secondary rounded bg-dark overflow-hidden transition-all"
                        >
                            {/* Accordion Trigger Header */}
                            <button
                                className="w-100 p-3 text-start bg-transparent border-0 d-flex align-items-center justify-content-between gap-3 text-white font-monospace"
                                onClick={() => toggleAccordion(item.id)}
                                style={{ outline: "none" }}
                            >
                                <span className={`fw-semibold ${isOpen ? "text-cyan" : "text-white"}`} style={{ fontSize: "0.9rem" }}>
                                    {item.question}
                                </span>
                                <span className={`text-cyan transition-transform fs-5 fw-bold`} style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)", display: "inline-block" }}>
                                    +
                                </span>
                            </button>

                            {/* Accordion Body Content Panel */}
                            {isOpen && (
                                <div className="p-3 bg-black bg-opacity-20 border-top border-secondary font-monospace text-muted" style={{ fontSize: "0.8rem", lineHeight: "1.5" }}>
                                    <div className="text-white opacity-75">
                                        {item.answer}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default CustomerFAQPage