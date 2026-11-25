import "@/lib/monaco-setup"
import { Editor, type OnMount } from "@monaco-editor/react"
import { useTheme } from "next-themes"
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react"
import type * as Monaco from "monaco-editor"
import { useSearchParams, useNavigate } from "react-router-dom"
import { BACKEND_BASE_URL, REPO_BASE_URL } from "@/config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Save, Search, Replace, FileCode2, Loader2, SquareText, CodeXml } from "lucide-react"
import { joinPath, trimSlashes } from "@/lib/utils"
import { MarkdownRenderer } from "@/components/MarkdownRenderer"
import { deletePageCache } from "@/lib/caching"
import { setNewStatus, type Message } from "@/lib/status"

export default function EditorPage({ setStatus }: {
    setStatus: Dispatch<SetStateAction<Message | null>>
}) {
    const { resolvedTheme } = useTheme()
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()

    const pageParam = searchParams.get("page") ?? "" 

    const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
    const [content, setContent] = useState("")
    const [savedContent, setSavedContent] = useState("")
    const [filename, setFilename] = useState("")
    const [pathname, setPathname] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isPreview, setIsPreview] = useState(false)
    const [uploadLimit, setUploadLimit] = useState<number | null>(null)

    const dirty = content !== savedContent

    useEffect(() => {
        fetch(`${BACKEND_BASE_URL}/info/upload-limit`)
            .then((r) => (r.ok ? r.text() : null))
            .then((t) => {
                const n = Number(t)
                if (Number.isFinite(n) && n > 0) setUploadLimit(n)
            })
            .catch(() => { })
    }, [])

    useEffect(() => {
        const parts = trimSlashes(pageParam).split("/").filter(Boolean)
        const name = parts.pop() ?? ""
        setFilename(name)
        setPathname(parts.length ? parts.join("/") + "/" : "")
    }, [pageParam])

    useEffect(() => {
        if (!pageParam) { setContent(""); setSavedContent(""); return }
        const ctrl = new AbortController()
        const name = trimSlashes(pageParam) || "index"
        setIsLoading(true)
        fetch(`${REPO_BASE_URL}/${name.split("/").map(encodeURIComponent).join("/")}`, { signal: ctrl.signal })
            .then(async (res) => {
                if (res.status === 404) { navigate("/-/edit", { replace: true }); return }
                if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`)
                const text = await res.text()
                setContent(text)
                setSavedContent(text)
            })
            .catch((err) => {
                if (err instanceof DOMException && err.name === "AbortError") return
                setNewStatus(err instanceof Error ? err.message : "Load error", true, setStatus)
            })
            .finally(() => { if (!ctrl.signal.aborted) setIsLoading(false) })
        return () => ctrl.abort()
    }, [pageParam])

    useEffect(() => {
        if (!dirty) return
        const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = "" }
        window.addEventListener("beforeunload", handler)
        return () => window.removeEventListener("beforeunload", handler)
    }, [dirty])

    const handleEditorDidMount: OnMount = (editor) => { editorRef.current = editor }
    const handleSearch = () => editorRef.current?.trigger("source", "actions.find", null)
    const handleReplace = () => editorRef.current?.trigger("source", "editor.action.startFindReplaceAction", null)

    const handleSave = async () => {
        let fileParam = joinPath(pathname, filename)
        if (trimSlashes(fileParam) === "") fileParam = "index"

        if (uploadLimit !== null && new TextEncoder().encode(content).length > uploadLimit) {
            setNewStatus(`File is too large (limit ${uploadLimit} bytes)`, true, setStatus)
            return
        }

        setIsSaving(true)
        try {
            const response = await fetch(
                `${BACKEND_BASE_URL}/manage/create?file=${encodeURIComponent(fileParam)}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ newName: fileParam, content }),
                    credentials: "include",
                },
            )
            if (!response.ok) {
                const text = await response.text().catch(() => "")
                throw new Error(text || `Save failed: ${response.status}`)
            }
            deletePageCache(fileParam)
            setSavedContent(content)
            setNewStatus("Saved", false, setStatus)
            setSearchParams({ page: fileParam })
        } catch (err) {
            setNewStatus(err instanceof Error ? err.message : "Save failed", true, setStatus)
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center w-full h-[600px] border rounded-md bg-muted/20">
                <Loader2 className="w-8 h-4 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full border shadow-sm overflow-hidden bg-background">
            <div className="flex flex-col sm:flex-row items-center justify-between p-2 gap-2 border-b bg-muted/40">
                <div className="flex items-center gap-2 sm:w-auto flex-1">
                    <FileCode2 className="hidden sm:block w-4 h-4 text-muted-foreground ml-1" />
                    <div className="h-8 flex flex-row items-center">{pathname}</div>
                    <Input value={filename} onChange={(e) => setFilename(e.target.value)}
                        className="h-8 bg-background max-w-full sm:max-w-[250px]" placeholder="File name..." />
                </div>
                <div className="flex items-center justify-end gap-1.5 w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3"
                        onClick={() => setIsPreview(!isPreview)}>
                        {!isPreview ? <SquareText /> : <CodeXml />}
                        <span className="hidden sm:inline">{isPreview ? "Editor" : "Preview"}</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleSearch} className="h-8 px-2 sm:px-3" title="Search (Ctrl+F)">
                        <Search className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Search</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleReplace} className="h-8 px-2 sm:px-3" title="Replace (Ctrl+H)">
                        <Replace className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Replace</span>
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isSaving || isLoading}
                        className="h-8 px-2 sm:px-3 min-w-[40px] sm:min-w-[110px]">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin sm:mr-2" /> : <Save className="w-4 h-4 sm:mr-2" />}
                        <span className="hidden sm:inline">{isSaving ? "Saving..." : "Save"}</span>
                    </Button>
                </div>
            </div>
            <div className="flex-grow relative">
                {!isPreview ? (
                    <Editor
                        onMount={handleEditorDidMount}
                        height="100%" width="auto" language="markdown"
                        theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
                        value={content}
                        onChange={(value) => setContent(value || "")}
                        options={{
                            minimap: { enabled: false }, fontSize: 14, wordWrap: "on",
                            scrollBeyondLastLine: false, automaticLayout: true, padding: { top: 12, bottom: 12 },
                        }}
                    />
                ) : (
                    <div className="p-4"><MarkdownRenderer content={content} ref={null} /></div>
                )}
            </div>
        </div>
    )
}