const faqItems = [
    {
        question: "Where are my encrypted files stored?",
        answer: "Files uploaded through Cloud Storage Link remain encrypted in the connected provider. Local demo records are shown in File Management."
    },
    {
        question: "Can StealthSync read my original file?",
        answer: "StealthSync encrypts the file before cloud upload and only decrypts it when you explicitly download or save it."
    },
    {
        question: "Which cloud providers can I link?",
        answer: "The prototype supports Google Drive integration and includes Dropbox and OneDrive link records. Free accounts can link one provider; premium accounts can link up to five."
    },
    {
        question: "What should I do if decryption fails?",
        answer: "Confirm that you selected the encrypted file created by StealthSync and that the account still has access to the encryption key or vault used for that file."
    },
    {
        question: "How do I protect account recovery?",
        answer: "Premium customers can generate a recovery phrase from Security. Store it offline and never share it with another person."
    }
]

/** Static sprint FAQ content; it intentionally has no API or database dependency. */
function CustomerFAQPage() {
    return (
        <section aria-labelledby="faq-heading">
            <h4 id="faq-heading" className="mb-2">Frequently Asked Questions</h4>
            <p className="text-muted mb-4">Quick answers about encryption, cloud links, and account recovery.</p>

            <div className="border-top">
                {faqItems.map((item) => (
                    <details key={item.question} className="py-3 border-bottom">
                        <summary className="fw-semibold">{item.question}</summary>
                        <p className="text-muted mt-2 mb-0">{item.answer}</p>
                    </details>
                ))}
            </div>
        </section>
    )
}

export default CustomerFAQPage