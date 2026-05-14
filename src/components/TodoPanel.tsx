import { useState } from 'react'
import type { TodoItem } from '../lib/types'

type Props = {
  todos: TodoItem[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onAdd: (text: string) => void
}

export function TodoPanel({ todos, onToggle, onDelete, onAdd }: Props) {
  const [input, setInput] = useState('')

  const handleAdd = () => {
    if (!input.trim()) return
    onAdd(input.trim())
    setInput('')
  }

  const pending = todos.filter(t => !t.done)
  const done = todos.filter(t => t.done)

  return (
    <section className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="font-mono text-sm tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>
          todos
        </span>
        <span className="font-mono text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {pending.length} left
        </span>
      </div>

      {/* Add input */}
      <div className="flex items-center border-b" style={{ borderColor: 'var(--border)' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="add a task..."
          className="flex-1 px-4 py-3 font-mono text-sm bg-transparent outline-none placeholder:text-[var(--muted-foreground)]"
          style={{ color: 'var(--foreground)' }}
        />
        <button
          onClick={handleAdd}
          className="px-4 font-mono text-sm border-l h-full transition-all"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)', backgroundColor: 'var(--accent)' }}
        >
          +
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {pending.length === 0 && done.length === 0 && (
          <p className="px-4 py-8 font-mono text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
            say "i will..." to add a task
          </p>
        )}

        {pending.map(todo => (
          <TodoRow key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} />
        ))}

        {done.length > 0 && (
          <>
            <div className="px-4 py-2 border-t border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}>
              <span className="font-mono text-sm" style={{ color: 'var(--muted-foreground)' }}>
                completed · {done.length}
              </span>
            </div>
            {done.map(todo => (
              <TodoRow key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} />
            ))}
          </>
        )}
      </div>
    </section>
  )
}

function TodoRow({ todo, onToggle, onDelete }: { todo: TodoItem; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div
      className="group flex items-start gap-3 px-4 py-3 border-b transition-colors fade-in"
      style={{ borderColor: 'var(--border)' }}
    >
      <button
        onClick={() => onToggle(todo.id)}
        className="mt-0.5 shrink-0 w-4 h-4 border rounded-sm flex items-center justify-center transition-colors"
        style={{
          borderColor: todo.done ? 'var(--foreground)' : 'var(--border)',
          backgroundColor: todo.done ? 'var(--foreground)' : 'transparent',
        }}
      >
        {todo.done && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 3L3 5L7 1" stroke="var(--background)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <span
        className="flex-1 text-sm leading-relaxed"
        style={{
          color: todo.done ? 'var(--muted-foreground)' : 'var(--foreground)',
          textDecoration: todo.done ? 'line-through' : 'none',
        }}
      >
        {todo.text}
      </span>

      <button
        onClick={() => onDelete(todo.id)}
        className="opacity-0 group-hover:opacity-100 font-mono text-sm transition-opacity"
        style={{ color: 'var(--muted-foreground)' }}
      >
        ×
      </button>
    </div>
  )
}
