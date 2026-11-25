import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Button } from "./ui/button"
import { Copy, Trash, EllipsisVertical, Plus, Pencil, Loader2, FilePen } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteRequest, renameRequest } from "@/lib/manage"
import { Input } from "./ui/input"
import { useState, type Dispatch, type SetStateAction } from "react"
import { setNewStatus, type Message } from "@/lib/status"
import { useAuth } from "./Auth"
import { trimSlashes } from "@/lib/utils"

export function ContextMenu({ setStatus, backendStatus }: {
    setStatus: Dispatch<SetStateAction<Message | null>>
    backendStatus: boolean
}) {
    const navigate = useNavigate()
    const location = useLocation()

    const [menuOpen, setMenuOpen] = useState(false)
    const [newName, setNewName] = useState("")
    const [openRename, setOpenRename] = useState(false)
    const [isRenaming, setIsRenaming] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const { user } = useAuth()
    const isInternalPage = location.pathname.startsWith("/-/")
    const canEdit = !isInternalPage && backendStatus && user != null

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            await deleteRequest(location.pathname)
            setNewStatus("Page deleted", false, setStatus)
            setMenuOpen(false)
            navigate("/")
        } catch (err) {
            setNewStatus(err instanceof Error ? err.message : "Delete failed", true, setStatus)
        } finally {
            setIsDeleting(false)
        }
    }

    const handleRename = async () => {
        setIsRenaming(true)
        try {
            await renameRequest(location.pathname, newName)
            setOpenRename(false)
            setMenuOpen(false)
            setNewStatus("Page renamed", false, setStatus)
            const target = trimSlashes(newName) || "index"
            navigate(target === "index" ? "/" : "/" + target)
        } catch (err) {
            setNewStatus(err instanceof Error ? err.message : "Rename failed", true, setStatus)
        } finally {
            setIsRenaming(false)
        }
    }

    return (
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger render={
                <Button variant="outline" aria-label="Page actions"><EllipsisVertical /></Button>
            } />
            <PopoverContent className="w-fit">
                <Button variant="ghost" className="flex flex-row gap-3 justify-start"
                    onClick={() => {
                        navigator.clipboard.writeText(window.location.href).catch(() => { })
                        setMenuOpen(false)
                    }}>
                    <Copy /><span>Copy link</span>
                </Button>

                {canEdit && (
                    <AlertDialog>
                        <AlertDialogTrigger render={
                            <Button variant="ghost" className="flex flex-row gap-3 justify-start">
                                <Trash /><span>Delete</span>
                            </Button>
                        } />
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    The page will be removed from the wiki (history stays in Git).
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                                    {isDeleting ? <Loader2 className="animate-spin" /> : "Continue"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}

                {canEdit && (
                    <AlertDialog open={openRename}
                        onOpenChange={(open) => { if (!isRenaming) setOpenRename(open) }}>
                        <AlertDialogTrigger render={
                            <Button variant="ghost" className="flex flex-row gap-3 justify-start"
                                onClick={() => { setNewName(location.pathname); setOpenRename(true) }}>
                                <Pencil /><span>Rename</span>
                            </Button>
                        } />
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Rename</AlertDialogTitle>
                                <AlertDialogDescription className="w-full">
                                    <div className="flex flex-col gap-4 w-full">
                                        <p className="text-center w-full">Enter a new path for the page.</p>
                                        <Input value={newName}
                                            onChange={(e) => setNewName(e.currentTarget.value)}
                                            className="w-full" placeholder="New filename"
                                            disabled={isRenaming} />
                                    </div>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isRenaming}>Cancel</AlertDialogCancel>
                                <Button onClick={handleRename}
                                    disabled={isRenaming || trimSlashes(newName) === ""}>
                                    {isRenaming
                                        ? (<><Loader2 className="animate-spin" />Renaming...</>)
                                        : "Continue"}
                                </Button>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}

                {backendStatus && user != null && (
                    <Button variant="ghost" className="flex flex-row gap-3 justify-start"
                        onClick={() => { setMenuOpen(false); navigate("/-/edit") }}>
                        <Plus /><span>Create</span>
                    </Button>
                )}
                {canEdit && (
                    <Button variant="ghost" className="flex flex-row gap-3 justify-start"
                        onClick={() => {
                            setMenuOpen(false)
                            navigate(`/-/edit?page=${encodeURIComponent(location.pathname)}`)
                        }}>
                        <FilePen /><span>Edit</span>
                    </Button>
                )}
            </PopoverContent>
        </Popover>
    )
}