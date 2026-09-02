interface Props {
  children: React.ReactNode
}

/**
 * Optional right-hand widget rail. `xl:flex` — the first thing to drop on
 * narrower viewports (per plan), since it's enhancement content rather than
 * core flow. Simply doesn't render at all below `xl`, preserving the app's
 * mobile-first ethos.
 */
export function RightRail({ children }: Props) {
  return (
    <aside className="hidden xl:flex xl:flex-col w-[280px] xl:w-[320px] flex-shrink-0 px-4 py-6 gap-4">
      {children}
    </aside>
  )
}
