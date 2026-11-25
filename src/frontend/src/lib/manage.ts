import { BACKEND_BASE_URL } from "@/config"
import { trimSlashes } from "./utils"
import { deletePageCache } from "./caching"

async function throwIfError(response: Response): Promise<void> {
    if (!response.ok) {
        const errorText = await response.text().catch(() => "")
        throw new Error(errorText || `Request error: ${response.status}`)
    }
}

export async function deleteRequest(file: string): Promise<void> {
    const name = trimSlashes(file) || "index"
    const response = await fetch(
        `${BACKEND_BASE_URL}/manage/delete?file=${encodeURIComponent(name)}`,
        { credentials: "include", method: "DELETE" },
    )
    await throwIfError(response)
    deletePageCache(name)
}

export async function renameRequest(file: string, newName: string): Promise<void> {
    const from = trimSlashes(file) || "index"
    const to = trimSlashes(newName) || "index"
    const response = await fetch(
        `${BACKEND_BASE_URL}/manage/rename?file=${encodeURIComponent(from)}&name=${encodeURIComponent(to)}`,
        { credentials: "include", method: "POST" },
    )
    await throwIfError(response)
    deletePageCache(from)
    deletePageCache(to)
}