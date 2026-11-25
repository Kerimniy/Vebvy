import { trimSlashes } from "./utils"

const PREFIX = "__cache__"
const TTL = 48 * 60 * 60 * 1000

function keyFor(path: string): string {
    return PREFIX + (trimSlashes(path) || "index")
}

interface CacheEntry { content: string; exp: number }

export function setPageCache(path: string, content: string): void {
    try {
        const entry: CacheEntry = { content, exp: Date.now() + TTL }
        localStorage.setItem(keyFor(path), JSON.stringify(entry))
    } catch {
    }
}

export function getPageCache(path: string): string | null {
    const key = keyFor(path)
    try {
        const raw = localStorage.getItem(key)
        if (raw === null) return null
        const entry = JSON.parse(raw) as CacheEntry
        if (typeof entry?.content !== "string" || typeof entry?.exp !== "number") {
            localStorage.removeItem(key)
            return null
        }
        if (entry.exp < Date.now()) {
            localStorage.removeItem(key)
            return null
        }
        return entry.content
    } catch {
        return null
    }
}

export function deletePageCache(path: string): void {
    try { localStorage.removeItem(keyFor(path)) } catch { }
}

export function cleanExpiredCache(): void {
    try {
        for (const key of Object.keys(localStorage)) {
            if (!key.startsWith(PREFIX)) continue
            try {
                const raw = localStorage.getItem(key)
                if (raw === null) continue
                const entry = JSON.parse(raw) as CacheEntry
                if (typeof entry?.exp !== "number" || entry.exp < Date.now()) {
                    localStorage.removeItem(key)
                }
            } catch {
                localStorage.removeItem(key) 
            }
        }
    } catch {  }
}