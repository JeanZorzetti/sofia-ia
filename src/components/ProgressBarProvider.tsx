'use client'

import { AppProgressBar } from 'next-nprogress-bar'

export function ProgressBarProvider() {
  return (
    <AppProgressBar
      height="2px"
      color="#ffffff"
      options={{ showSpinner: false, easing: 'ease', speed: 300 }}
      shallowRouting
    />
  )
}
