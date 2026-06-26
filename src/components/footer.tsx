import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container mx-auto px-4 py-6">
        <p className="text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} Lumintusuite. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
