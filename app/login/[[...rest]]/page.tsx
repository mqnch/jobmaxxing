import { SignIn } from '@clerk/nextjs'
import { dark } from '@clerk/themes'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-start justify-center pt-[15vh] p-4 bg-[#0a0a0a]">
      <SignIn
        path="/login"
        fallbackRedirectUrl="/jobs"
        appearance={{
          baseTheme: dark,
          variables: {
            colorPrimary: '#2563eb', // Blue matching the Login buttons
            colorBackground: '#111111', // Card background matching navbar
            colorText: '#f5f5f5',
            colorTextSecondary: '#a0a0a0',
            colorInputBackground: '#0a0a0a',
            colorInputText: '#f5f5f5',
            colorBorder: 'rgba(255,255,255,0.1)',
          },
          elements: {
            card: 'border border-[rgba(255,255,255,0.1)] shadow-2xl bg-[#111111]',
            headerTitle: 'text-[#f5f5f5] font-bold',
            headerSubtitle: 'text-[#a0a0a0]',
            socialButtonsBlockButton: 'border border-[rgba(255,255,255,0.1)] bg-[#0a0a0a] hover:bg-[rgba(255,255,255,0.05)] text-[#f5f5f5]',
            socialButtonsBlockButtonText: 'text-[#f5f5f5] font-medium',
            dividerText: 'text-[#888888] bg-[#111111]',
            dividerLine: 'bg-[rgba(255,255,255,0.1)]',
            formFieldLabel: 'text-[#a0a0a0] font-medium',
            formFieldInput: 'text-[#f5f5f5] bg-[#0a0a0a] border border-[rgba(255,255,255,0.1)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
            footerActionText: 'text-[#a0a0a0]',
            footerActionLink: 'text-blue-500 hover:text-blue-400 font-medium',
            formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white font-medium',
          }
        }}
      />
    </div>
  )
}
