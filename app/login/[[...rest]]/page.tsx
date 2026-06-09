import { SignIn } from '@clerk/nextjs'

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-start justify-center pt-[10vh] p-4">
      <SignIn
        path="/login"
        fallbackRedirectUrl="/jobs"
        appearance={{
          variables: {
            colorPrimary: '#0f172a',
            colorBackground: '#ffffff',
            colorText: '#0f172a',
            colorTextSecondary: '#475569',
            colorInputBackground: '#ffffff',
            colorInputText: '#0f172a',
            colorBorder: '#e2e8f0',
          },
          elements: {
            card: 'border-none rounded-none bg-white shadow-none',
            headerTitle: 'text-slate-900 font-bold',
            headerSubtitle: 'text-slate-500',
            socialButtonsBlockButton: 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-lg border-none shadow-none',
            socialButtonsBlockButtonText: 'text-slate-700 font-medium',
            dividerText: 'text-slate-400 bg-white',
            dividerLine: 'bg-slate-100',
            formFieldLabel: 'text-slate-600 font-medium',
            formFieldInput: 'text-slate-800 bg-slate-100 rounded-none focus:bg-white border-none focus:ring-0 focus:outline-none',
            footerActionText: 'text-slate-500',
            footerActionLink: 'text-slate-900 hover:text-slate-800 font-semibold underline',
            formButtonPrimary: 'bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg border-none',
          }
        }}
      />
    </div>
  )
}
