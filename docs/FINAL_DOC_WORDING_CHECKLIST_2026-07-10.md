# Final Documentation Wording Checklist - 2026-07-10

Use this checklist when editing the User Manual, Technical Manual, slides, and video script.

## Avoid / Replace These Claims

- Do not say Physical Token has implemented real USB authentication.
- Do not say Recovery Phrase can recover a master key or file key.
- Do not say an AI/ML model is completed.
- Do not say the desktop installer is the final validation target.
- Do not say workspace sharing is implemented.
- Do not say ticket system is implemented unless the code actually exists and is tested.

## Recommended Wording

- "Physical Token prototype records token registration and activation status."
- "Recovery Phrase supports account/login recovery."
- "Privacy warning is rule-based and local/sample-based."
- "Admin suspicious logs are rule-based flags."
- "Web application is the validated demo target."
- "Workspace sharing, full ticket system, true hardware token authentication, and true ML are Future Work."

## Manual-Specific Notes

- In prerequisites, describe the web app/startup path as the current validation flow.
- In installation, do not present desktop packaging as fully validated until the known issue is fixed.
- In security sections, separate implemented JWT/RBAC/owner isolation from prototype physical-token and recovery-phrase limitations.
- In AI/privacy sections, use "rule-based sensitive-data warning" rather than "ML model".
- In support sections, say the FAQ page gives support guidance and the full ticket lifecycle is Future Work.
