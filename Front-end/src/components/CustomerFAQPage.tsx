import { useState } from "react"
import type { UserAccount } from "../Type"

type Props = {
    user: UserAccount
}

type FAQItem = {
    id: number
    module: string
    question: string
    answer: string
    premiumExclusive?: boolean
}

function CustomerFAQPage({ user }: Props) {
    const [openId, setOpenId] = useState<number | null>(null)

    const faqData: FAQItem[] = [
        {
            id: 1,
            module: "FILE_ACTION",
            question: "How do I safely download and decrypt my synchronized files?",
            answer: "Navigate to your workspace files matrix, select the encrypted file item, and click 'Decrypt & Download'. Because this app operates in a secure native wrapper, the file won't drop inside your browser session. Instead, the local background process securely streams and processes the file payload directly into your system's default local 'Downloads' directory folder."
        },
        {
            id: 2,
            module: "TOKEN_SETUP",
            question: "How do I bind my physical security token to my premium profile?",
            answer: "Go to your Account Profile layout, look under the Hardware Token section, and click 'Register Token'. Insert your physical authentication key into an open USB terminal slot and tap its capacitive copper sensor surface when asked. The application layer will generate a permanent cryptographic relationship, locking key account parameters to that hardware device.",
            premiumExclusive: true
        },
        {
            id: 3,
            module: "UPGRADE_FLOW",
            question: "How do I change my subscription status from Base to Premium?",
            answer: "Click on 'View Account' inside your profile interface, then click the 'Change Plan' option to display the available system wrappers. Select your preferred tier, click 'Upgrade Profile', and confirm the deployment inside the confirmation pop-up. The interface updates instantly to unlock your new hardware authentication modules."
        },
        {
            id: 4,
            module: "EMERGENCY_RECOVERY",
            question: "What steps should I take if I lose my Master Passphrase?",
            answer: "On the login view interface, select 'Recover Account with Phrase'. You will be requested to input your unique 24-word secure recovery phrase. If you are a premium customer, you can alternatively attach your physical recovery token to instantly unlock your data blocks. If you lose both options, your data cannot be recovered due to zero-knowledge encryption.",
            premiumExclusive: true
        },
        {
            id: 5,
            module: "TROUBLESHOOTING",
            question: "What should I do if I see a 'GATEWAY_DISCONNECT' alert on my cloud dashboard?",
            answer: "This status means the link between the platform application and your remote Google Drive database index has timed out. Go to your Connection Matrix configurations, click 'Re-authenticate Gateway', and sign back into your remote account profile to restore real-time file synchronization parameters."
        },
        {
            id: 6,
            module: "ACCOUNT_SECURITY",
            question: "Can I use my physical token to log in from a secondary machine?",
            answer: "Yes. Once a hardware authentication key is bound to your profile, you can download the application client onto any secondary system terminal. During the secondary device's initial validation phase, simply present your token tool to clear the hardware challenge gate.",
            premiumExclusive: true
        },
        {
            id: 7,
            module: "DATA_AUDITING",
            question: "How do I check if a file has been modified or poisoned?",
            answer: "Every time you open or access a file in your directory view, the system runs an automated background checksum analysis, checking the file layout against its native hash footprint. If a mismatch or structural poisoning trigger is detected, the dashboard locks the file and displays an alert badge."
        }
    ]

    const toggleAccordion = (id: number) => {
        setOpenId(openId === id ? null : id)
    }

    return (
        <div style={{ fontFamily: "system-ui, -apple-system, sans-serif" }} className="w-100 text-white animate-fade-in">
            {/* Header Section */}
            <div className="border-bottom border-secondary pb-3 mb-4">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                        <h4 className="text-white fw-bold mb-1" style={{ letterSpacing: "0.5px" }}>
                            USER GUIDE & SYSTEM FAQ
                        </h4>
                        <p style={{ fontSize: "0.95rem", color: "#d4d4d8" }} className="mb-0">
                            Step-by-step feature workflows, usage instructions, and access setups.
                        </p>
                    </div>
                    <div className="px-3 py-1.5 rounded border border-dark font-monospace" style={{ backgroundColor: "#141417", fontSize: "0.85rem", borderColor: "#27272a" }}>
                        Active Profile: <span style={{ color: "#06b6d4" }} className="fw-bold text-uppercase">{user.isSubscribed ? "Premium Tiers" : "Base Tier"}</span>
                    </div>
                </div>
            </div>

            {/* Accordion Layout Matrix */}
            <div className="d-flex flex-column gap-3">
                {faqData.map((item) => {
                    const isOpen = openId === item.id
                    const isRestrictedForUser = item.premiumExclusive && !user.isSubscribed

                    return (
                        <div 
                            key={item.id} 
                            className="border rounded overflow-hidden transition-all"
                            style={{ 
                                backgroundColor: "#141417", 
                                borderColor: isOpen ? "#06b6d4" : "#27272a" 
                            }}
                        >
                            {/* Accordion Trigger Header */}
                            <button
                                className="w-100 p-3 text-start bg-transparent border-0 d-flex align-items-center justify-content-between gap-3 text-white"
                                onClick={() => toggleAccordion(item.id)}
                                style={{ outline: "none" }}
                            >
                                <div className="d-flex flex-column gap-1">
                                    <span className="font-monospace text-uppercase opacity-50 fw-semibold" style={{ fontSize: "11px", letterSpacing: "1px", color: "#06b6d4" }}>
                                        [{item.module}]
                                    </span>
                                    <span className="fw-semibold text-white" style={{ fontSize: "0.95rem" }}>
                                        {item.question}
                                    </span>
                                </div>
                                <div className="d-flex align-items-center gap-3">
                                    {item.premiumExclusive && (
                                        <span className={`badge ${isRestrictedForUser ? "text-bg-warning text-dark" : "text-bg-info text-dark"}`} style={{ fontSize: "10px", fontWeight: "bold", letterSpacing: "0.5px" }}>
                                            PREMIUM
                                        </span>
                                    )}
                                    <span 
                                        className="fw-bold fs-5 transition-transform" 
                                        style={{ 
                                            color: isOpen ? "#06b6d4" : "#a1a1aa",
                                            transform: isOpen ? "rotate(45deg)" : "rotate(0deg)", 
                                            display: "inline-block" 
                                        }}
                                    >
                                        +
                                    </span>
                                </div>
                            </button>

                            {/* Accordion Body Content Panel */}
                            {isOpen && (
                                <div className="p-3 border-top" style={{ backgroundColor: "#0b0c10", borderColor: "#27272a", fontSize: "0.9rem", lineHeight: "1.6" }}>
                                    <div style={{ color: "#d4d4d8" }}>
                                        {item.answer}
                                    </div>
                                    {isRestrictedForUser && (
                                        <div className="mt-3 p-2.5 rounded border border-warning-subtle text-warning bg-warning bg-opacity-10 d-flex align-items-center gap-2" style={{ fontSize: "0.8rem" }}>
                                            ⚠️ <span><strong>ACCESS_DENIED:</strong> Your active base profile parameters cannot execute configurations inside this premium security wrapper module. Upgrade your account to enable this hardware asset.</span>
                                        </div>
                                    )}
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