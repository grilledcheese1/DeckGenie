'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { SettingsForm } from './SettingsForm'

interface Props {
  onClose: () => void
}

export function SettingsPanel({ onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3 }
      )
      gsap.fromTo(panelRef.current,
        { x: '100%' },
        { x: '0%', duration: 0.45, ease: 'power3.out' }
      )
    })
    return () => ctx.revert()
  }, [])

  function handleClose() {
    const tl = gsap.timeline({ onComplete: onClose })
    tl.to(panelRef.current, { x: '100%', duration: 0.35, ease: 'power3.in' })
    tl.to(overlayRef.current, { opacity: 0, duration: 0.2 }, '-=0.2')
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === overlayRef.current) handleClose() }}
    >
      <div
        ref={panelRef}
        className="w-full sm:max-w-[420px] h-full overflow-y-auto px-4 py-10"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <SettingsForm mode="edit" onDone={handleClose} onBack={handleClose} />
      </div>
    </div>
  )
}
