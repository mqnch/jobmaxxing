import Link from 'next/link'

export default function AuthCodeError() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-[#111111] border border-[rgba(255,255,255,0.1)] rounded-lg">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-[#f5f5f5]">
            Authentication Error
          </h2>
          <p className="mt-2 text-center text-sm text-[#a0a0a0]">
            There was an error authenticating. Please try logging in again.
          </p>
        </div>
        <div>
          <Link
            href="/login"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
