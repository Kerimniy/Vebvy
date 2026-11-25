import type { Dispatch, SetStateAction } from "react"

export interface Message { value: string; isError: boolean }

let timer: ReturnType<typeof setTimeout> | null = null

export function setNewStatus(
    msg: string,
    isError: boolean,
    setStatus: Dispatch<SetStateAction<Message | null>>,
): void {
    if (timer !== null) clearTimeout(timer)
    setStatus({ value: msg, isError })
    timer = setTimeout(() => { setStatus(null); timer = null }, 10000)
}