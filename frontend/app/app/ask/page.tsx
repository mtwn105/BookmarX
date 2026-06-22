"use client"

import { useCallback, useRef, useState } from "react"
import Link from "next/link"
import { ArtificialIntelligence01Icon, CancelSquareIcon, SentIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type Source = {
  bookmarkId: string
  postText: string
  authorUsername: string | null
  authorDisplayName: string | null
  xPostId: string
}

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: Source[]
}

const suggestions = [
  "What themes keep appearing in my bookmarks?",
  "Summarize what I saved about AI agents.",
  "Which tools should I revisit this week?",
]

export default function AskPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (question: string) => {
      const trimmed = question.trim()
      if (!trimmed || loading) {
        return
      }

      const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: trimmed }
      const assistantId = crypto.randomUUID()
      const history = [...messages, userMessage]
      setMessages([...history, { id: assistantId, role: "assistant", content: "" }])
      setInput("")
      setLoading(true)

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const response = await fetch("/api/ai/chat/stream", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            messages: history.map(({ role, content }) => ({ role, content })),
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error("The AI service could not answer right now.")
        }

        const sources = parseSources(response.headers.get("X-Sources"))
        setMessages((current) =>
          current.map((message) => (message.id === assistantId ? { ...message, sources } : message)),
        )

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error("The response stream was unavailable.")
        }

        const decoder = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }
          const chunk = decoder.decode(value, { stream: true })
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId ? { ...message, content: message.content + chunk } : message,
            ),
          )
        }
      } catch (error) {
        if (!(error instanceof Error && error.name === "AbortError")) {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, content: error instanceof Error ? error.message : "Something went wrong." }
                : message,
            ),
          )
        }
      } finally {
        setLoading(false)
        abortRef.current = null
      }
    },
    [loading, messages],
  )

  return (
    <div className="mx-auto flex min-h-[calc(100svh-8.5rem)] max-w-3xl flex-col">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-ai">Intelligent chat</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Ask your archive</h1>
        <p className="mt-2 text-muted-foreground">Answers are grounded in your saved X posts and include citations.</p>
      </div>

      <div className="flex-1 py-8">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-xl py-12 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-ai text-ai-foreground shadow-lg shadow-ai/20">
              <HugeiconsIcon icon={ArtificialIntelligence01Icon} size={24} />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Your bookmarks are the context</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ask for comparisons, summaries, patterns, or a specific post you remember vaguely.
            </p>
            <div className="mt-6 grid gap-2">
              {suggestions.map((suggestion) => (
                <Button className="h-auto justify-start py-3 text-left font-medium" key={suggestion} onClick={() => void sendMessage(suggestion)} variant="outline">
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} pending={loading && !message.content} />
            ))}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 -mx-2 bg-background/88 px-2 pb-2 pt-3 backdrop-blur-xl">
        <form
          className="relative"
          onSubmit={(event) => {
            event.preventDefault()
            void sendMessage(input)
          }}
        >
          <Textarea
            className="min-h-16 resize-none border-ai/20 pr-14 shadow-[0_10px_35px_rgba(124,58,237,0.08)] focus-visible:border-ai focus-visible:ring-ai/15"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                void sendMessage(input)
              }
            }}
            placeholder="Ask a follow-up…"
            rows={2}
            value={input}
          />
          {loading ? (
            <Button
              className="absolute bottom-2 right-2"
              onClick={() => abortRef.current?.abort()}
              size="icon"
              type="button"
              variant="outline"
            >
              <HugeiconsIcon icon={CancelSquareIcon} />
              <span className="sr-only">Stop response</span>
            </Button>
          ) : (
            <Button className="absolute bottom-2 right-2 bg-ai shadow-ai/20 hover:bg-[#6d28d9]" disabled={!input.trim()} size="icon" type="submit">
              <HugeiconsIcon icon={SentIcon} />
              <span className="sr-only">Send message</span>
            </Button>
          )}
        </form>
        <p className="mt-2 text-center text-xs text-muted-foreground">AI can miss context. Open citations to verify.</p>
      </div>
    </div>
  )
}

function ChatMessage({ message, pending }: { message: Message; pending: boolean }) {
  const assistant = message.role === "assistant"

  return (
    <div className={cn("flex gap-3", !assistant && "justify-end")}>
      {assistant ? (
        <Avatar className="mt-0.5">
          <AvatarFallback className="bg-ai text-ai-foreground">AI</AvatarFallback>
        </Avatar>
      ) : null}
      <div className={cn("min-w-0 max-w-[85%]", !assistant && "rounded-2xl bg-primary px-4 py-3 text-primary-foreground")}>
        {pending ? (
          <div className="flex gap-1 py-2">
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:120ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:240ms]" />
          </div>
        ) : assistant ? (
          <div className="prose prose-sm max-w-none text-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
        )}

        {assistant && message.sources && message.sources.length > 0 ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {message.sources.slice(0, 6).map((source, index) => (
              <Card className="gap-2 border-ai/10 bg-ai/[0.035] p-3 shadow-none transition-colors hover:border-ai/25" key={source.bookmarkId} size="sm">
                <Link className="block" href={`/app/bookmarks/${source.bookmarkId}`}>
                  <p className="text-xs font-medium text-muted-foreground">
                    [{index + 1}] {source.authorUsername ? `@${source.authorUsername}` : "Saved post"}
                  </p>
                  <p className="mt-1 line-clamp-3 text-sm leading-5">{source.postText}</p>
                </Link>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function parseSources(header: string | null): Source[] {
  try {
    return JSON.parse(decodeURIComponent(header ?? "[]")) as Source[]
  } catch {
    return []
  }
}
