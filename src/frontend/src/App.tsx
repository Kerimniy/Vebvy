
import { ThemeProvider } from "next-themes"

import Page from "./pages/Page";
import { AuthProvider } from "@/components/Auth"
import { useEffect, useState } from "react";
import { BACKEND_BASE_URL, PAGE_TITLE } from "./config";
import { useLocation } from "react-router-dom";
import { cleanExpiredCache } from "./lib/caching";



export default function App() {

  const [backendStatus, setBackendStatus] = useState(false)

  const location = useLocation()

  useEffect(() => {
    let pathElements = location.pathname.split("/")

    if (pathElements.length > 1 && pathElements[pathElements.length - 1] != "") {
      document.title = `${pathElements[pathElements.length - 1]} — ${PAGE_TITLE}`
    } else {
      document.title = `Home — ${PAGE_TITLE}`

    }

  }, [location.pathname])

  useEffect(() => {
    cleanExpiredCache()
    const ctrl = new AbortController()
    const ping = async () => {
      try {
        const res = await fetch(`${BACKEND_BASE_URL}/api/generate-204`, { signal: ctrl.signal })
        setBackendStatus(res.ok)
      } catch {
        if (!ctrl.signal.aborted) setBackendStatus(false)
      }
    }
    ping()
    const id = setInterval(ping, 30_000)
    return () => { ctrl.abort(); clearInterval(id) }
  }, [])

  return (
    <AuthProvider>
      <div className="flex h-screen w-full">
        <ThemeProvider attribute="class"
          defaultTheme="system"
          enableSystem>
          <Page backendStatus={backendStatus} />


        </ThemeProvider>
      </div>
    </AuthProvider>
  )
}