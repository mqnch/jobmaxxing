import Link from 'next/link'

export default function AuthCodeError() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-white border border-slate-300 rounded-none shadow-none">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-slate-900">
            Authentication Error
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500 font-medium">
            There was an error authenticating. Please try logging in again.
          </p>
        </div>
        <div>
          <Link
            href="/login"
            className="w-full flex justify-center py-2.5 px-4 rounded-lg text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
