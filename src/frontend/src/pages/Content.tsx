import { MarkdownRenderer } from "@/components/MarkdownRenderer"
import { Spinner } from "@/components/ui/spinner"
import { REPO_BASE_URL } from "@/config"
import { useEffect, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { OpenImage } from "@/components/Image"
import { tocStore, type IndexElement } from "@/lib/toc-store"
import { getPageCache, setPageCache } from "@/lib/caching"
import { trimSlashes } from "@/lib/utils"

const NOT_FOUND = `
# 404 Page not found
### Return to Main page
`

function pageFetchUrl(pathname: string): string {
    const name = trimSlashes(pathname)
    if (name.startsWith("-/docs/")) {
        // public/ отдаётся с корня сайта — префикса /public в сборке нет
        return `/pages/${encodeURIComponent(name.slice("-/docs/".length))}.md`
    }
    const encoded = (name || "index").split("/").map(encodeURIComponent).join("/")
    return `${REPO_BASE_URL}/${encoded}`
}

export default function Content() {
    const location = useLocation()
    const [content, setContent] = useState<string>(() => getPageCache(location.pathname) ?? "")
    const [loading, setLoading] = useState<boolean>(() => getPageCache(location.pathname) === null)
    const [isOpenImage, setIsOpenImage] = useState(false)
    const [imageSrc, setImageSrc] = useState("")
    const rendererRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const ctrl = new AbortController()
        const cached = getPageCache(location.pathname)
        setContent(cached ?? "")
        setLoading(cached === null)
        tocStore.set({ items: [], activeId: "" }) // не показываем TOC прошлой страницы

            ; (async () => {
                try {
                    const resp = await fetch(pageFetchUrl(location.pathname), { signal: ctrl.signal })
                    const htmlFallback = resp.headers.get("content-type")?.includes("text/html")
                    if (resp.ok && !htmlFallback) {
                        const page = await resp.text()
                        if (ctrl.signal.aborted) return
                        setContent(page)
                        setPageCache(location.pathname, page)
                    } else if (resp.status === 404 || htmlFallback) {
                        setContent(NOT_FOUND)
                    } else {
                        setContent(`Error ${resp.status}`)
                    }
                } catch (e) {
                    if (e instanceof DOMException && e.name === "AbortError") return
                    setContent("Unexpected error!")
                } finally {
                    if (!ctrl.signal.aborted) setLoading(false)
                }
            })()
        return () => ctrl.abort()
    }, [location.pathname])

    useEffect(() => {
        const container = rendererRef.current
        if (!container || loading) return

        const headers = Array.from(container.querySelectorAll("h1, h2, h3, h4, h5, h6"))
        const index: IndexElement[] = headers.map((el, i) => {
            el.id = `${el.textContent}-${i.toString(36)}`
            return { title: el.textContent, type: el.tagName.toLowerCase(), id: el.id, y: 0 }
        })

        const measure = () => {
            const top = container.getBoundingClientRect().top
            for (const item of index) {
                const el = document.getElementById(item.id)
                if (el) item.y = el.getBoundingClientRect().top - top + container.scrollTop
            }
        }
        measure()
        tocStore.set({ items: index })

        const onScroll = () => {
            if (index.length === 0) return
            const y = container.scrollTop + 30
            let left = 0, right = index.length - 1, result = 0
            while (left <= right) {
                const mid = (left + right) >> 1
                if (index[mid].y <= y) { result = mid; left = mid + 1 } else { right = mid - 1 }
            }
            tocStore.set({ activeId: index[result].id })
        }
        onScroll()
        container.addEventListener("scroll", onScroll, { passive: true })

        // позиции плывут после загрузки картинок/шрифтов — перемеряем
        const images = Array.from(container.querySelectorAll("img"))
        for (const img of images) {
            if (!img.complete) img.addEventListener("load", measure, { once: true })
        }
        document.fonts?.ready.then(() => { measure(); onScroll() }).catch(() => { })
        window.addEventListener("resize", measure)

        // один делегированный листнер вместо N неснимаемых
        const onClick = (e: MouseEvent) => {
            const img = (e.target as HTMLElement).closest("img")
            if (img) { setImageSrc(img.src); setIsOpenImage(true) }
        }
        container.addEventListener("click", onClick)

        return () => {
            container.removeEventListener("scroll", onScroll)
            container.removeEventListener("click", onClick)
            window.removeEventListener("resize", measure)
            for (const img of images) img.removeEventListener("load", measure)
        }
    }, [content, loading])

    useEffect(() => {
        if (loading) return
        const id = decodeURIComponent(location.hash.replace(/^#/, ""))
        if (!id) return
        requestAnimationFrame(() => {
            document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" })
        })
    }, [content, loading, location.hash])

    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <OpenImage src={imageSrc} setIsOpen={setIsOpenImage} isOpen={isOpenImage} />
            {loading ? (
                <div className="flex flex-col items-center justify-center w-full h-full p-4">
                    <div className="max-w-[4rem] w-full aspect-square">
                        <Spinner className="w-full h-full" />
                    </div>
                    <div className="text-xl p-4">Loading...</div>
                </div>
            ) : (
                <MarkdownRenderer ref={rendererRef} content={content} />
            )}
        </div>
    )
}