export function Footer() {
  return (
    <footer className="border-t border-slate-200/50 bg-white/80 backdrop-blur">
      <div className="container mx-auto px-4 py-4">
        <p className="text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} Lumintusuite. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
