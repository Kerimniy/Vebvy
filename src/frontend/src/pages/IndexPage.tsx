import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner"
import { REPO_BASE_URL } from "@/config"
import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"

import { ChevronRight, Folder, Newspaper } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";


interface TreeNode {
    name: string
    path: string
    isFile: boolean
    children: TreeNode[]
}



type AlphabetTree = Record<string, TreeNode[]>;

function buildTree(files: Record<string, boolean>): AlphabetTree {
    const roots: TreeNode[] = []
    for (const [path, registered] of Object.entries(files)) {
        if (!registered) continue
        const parts = path.split("/").filter(Boolean)
        if (parts.length === 0) continue
        let currentPath = ""
        let siblings = roots
        for (let i = 0; i < parts.length; i++) {
            const name = parts[i]
            currentPath += "/" + name
            let node = siblings.find((item) => item.name === name)
            if (!node) {
                node = { name, path: currentPath, isFile: false, children: [] }
                siblings.push(node)
            }
            if (i === parts.length - 1) node.isFile = true
            siblings = node.children
        }
    }

    function sortNodes(nodes: TreeNode[]): void {
        nodes.sort((a, b) => a.name.localeCompare(b.name))
        for (const node of nodes) sortNodes(node.children)
    }
    sortNodes(roots)

    const result: AlphabetTree = {}
    for (const node of roots) {
        const letter = node.name[0].toLocaleUpperCase()
            ; (result[letter] ??= []).push(node)
    }
    return Object.fromEntries(
        Object.entries(result).sort(([a], [b]) => a.localeCompare(b))
    )
}
export default function IndexPage() {
    const location = useLocation()

    const [content, setContent] = useState<AlphabetTree | null>()
    const [loading, setLoading] = useState(true)


    useEffect(() => {
        const ctrl = new AbortController()
        setLoading(true)
            ; (async () => {
                try {
                    const resp = await fetch(`${REPO_BASE_URL}/index.json`, { signal: ctrl.signal })
                    if (!resp.ok && resp.status !== 404) throw new Error(`HTTP ${resp.status}`)
                    else if (resp.status == 404) {
                        setContent({"":[{name: "No Index for now", path:'',children:[], isFile: true}]})
                    }
                    else {
                        setContent(buildTree(resp.ok ? await resp.json() : {}))
                    }
                } catch (e) {
                    if (e instanceof DOMException && e.name === "AbortError") return
                    setContent({})
                } finally {
                    if (!ctrl.signal.aborted) setLoading(false)
                }
            })()
        return () => ctrl.abort()
    }, [location.pathname])


  

    return (
        <div className="p-4 w-full h-full">
            {loading ?
                <div className="flex flex-col items-center justify-center w-full h-full">
                    <div className="max-w-[4rem] w-full aspect-square">
                        <Spinner className="w-full h-full"></Spinner>
                    </div>
                    <div className="text-xl p-4">Loading...</div>
                </div> :
                <FileTree content={content}></FileTree>
            }

        </div>
    )

}

function TreeItem({ node }: { node: TreeNode }) {
    const [open, setOpen] = useState(false)
    const hasChildren = node.children.length > 0

    const label = (
        <>
            {hasChildren
                ? <Folder className="size-4 shrink-0 text-amber-500" />
                : <Newspaper className="size-4 shrink-0 text-muted-foreground" />}
            <span className="truncate">{node.name}</span>
        </>
    )

    return (
        <div className="select-none">
            <Collapsible open={open} onOpenChange={setOpen}>
                <div className="flex items-center gap-1">
                    {hasChildren ? (
                        <CollapsibleTrigger render={
                            <Button variant="ghost" className="h-8 w-6 shrink-0 justify-center px-0"
                                aria-label={open ? "Collapse" : "Expand"}>
                                <ChevronRight className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
                            </Button>
                        } />
                    ) : <span className="w-6 shrink-0" />}

                    {node.isFile ? (
                        <Link to={node.path} title={node.path}
                            className="h-8 min-w-0 flex-1 flex items-center gap-2 rounded-md px-2 text-sm hover:bg-accent">
                            {label}
                        </Link>
                    ) : (
                        <CollapsibleTrigger render={
                            <Button variant="ghost" className="h-8 min-w-0 flex-1 justify-start gap-2 px-2 font-normal">
                                {label}
                                <span className="ml-auto text-xs text-muted-foreground">{node.children.length}</span>
                            </Button>
                        } />
                    )}
                </div>
                <CollapsibleContent>
                    <div className="ml-4 border-l pl-3">
                        {node.children.map((child) => <TreeItem key={child.path} node={child} />)}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    )
}

export function FileTree({
    content,
}: {
    content: AlphabetTree | null | undefined ;
}) {
    if (content==null || content==undefined){
        return <></>
    }
    return (
        <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            {Object.entries(content).map(([letter, nodes]) => (
                <section
                    className="min-w-0 rounded-xl border bg-card p-3"
                    key={letter}
                >
                    <div className="mb-1 flex items-center gap-2 px-2 py-1">
                        <span className="flex size-7 items-center justify-center rounded-md bg-muted text-sm font-semibold">
                            {letter}
                        </span>

                    </div>

                    <div className="space-y-0.5">
                        {nodes.map((node) => (
                            <TreeItem key={node.path} node={node} />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}