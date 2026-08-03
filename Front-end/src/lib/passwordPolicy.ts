export const passwordPolicyMessage =
    "Password must be 8-128 characters and include uppercase, lowercase, number, and symbol."

const strongPassword = /^(?=.{8,128}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).*$/

export const isStrongPassword = (password: string) => strongPassword.test(password)
