import { createContext, useContext, useState, useCallback } from 'react'
import Icon from './Icon.jsx'

// App-level dialogs replacing native alert/confirm/prompt.
//   const { confirm, prompt, notify } = useDialogs()
//   if (await confirm({ title, message, danger })) { … }
//   const name = await prompt({ title, label })   // string | null
//   notify('Saved')                               // toast
const DialogCtx = createContext(null)
export const useDialogs = () => useContext(DialogCtx)

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const [toasts, setToasts] = useState([])

  const confirm = useCallback((opts = {}) => new Promise((resolve) => setDialog({ type: 'confirm', resolve, ...opts })), [])
  const prompt = useCallback((opts = {}) => new Promise((resolve) => setDialog({ type: 'prompt', resolve, ...opts })), [])
  const notify = useCallback((message, tone = 'default') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600)
  }, [])

  const finish = (result) => { dialog?.resolve(result); setDialog(null) }

  return (
    <DialogCtx.Provider value={{ confirm, prompt, notify }}>
      {children}
      {dialog && <DialogModal dialog={dialog} onClose={finish} />}
      <div className="toast-wrap">
        {toasts.map((t) => <div key={t.id} className={'toast' + (t.tone !== 'default' ? ' ' + t.tone : '')}>{t.message}</div>)}
      </div>
    </DialogCtx.Provider>
  )
}

function DialogModal({ dialog, onClose }) {
  const isPrompt = dialog.type === 'prompt'
  const [value, setValue] = useState(dialog.defaultValue || '')
  const cancel = () => onClose(isPrompt ? null : false)
  const accept = () => onClose(isPrompt ? value : true)
  return (
    <div className="modal-backdrop dialog-backdrop" onClick={cancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <span className={'dialog-icon' + (dialog.danger ? ' danger' : '')}>
            <Icon name={dialog.danger ? 'alert' : isPrompt ? 'pencil' : 'check'} size={20} />
          </span>
          <h3>{dialog.title || (isPrompt ? 'Enter a value' : 'Are you sure?')}</h3>
        </div>
        {dialog.message && <p className="dialog-msg">{dialog.message}</p>}
        {isPrompt && (
          <label className="field" style={{ marginBottom: 0 }}>
            {dialog.label && <span>{dialog.label}</span>}
            <input autoFocus value={value} placeholder={dialog.placeholder || ''} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') accept(); if (e.key === 'Escape') cancel() }} />
          </label>
        )}
        <div className="dialog-actions">
          <button className="btn" onClick={cancel}>{dialog.cancelLabel || 'Cancel'}</button>
          <button className={'btn ' + (dialog.danger ? 'danger' : 'primary')} onClick={accept} disabled={isPrompt && !value.trim()}>
            {dialog.confirmLabel || (isPrompt ? 'Save' : 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
