import { useContext } from 'react'

import { CamerasContext } from './CamerasContext'

export function useCameras() {
  const context = useContext(CamerasContext)

  if (!context) {
    throw new Error(
      'useCameras must be used inside CamerasProvider.',
    )
  }

  return context
}

export default useCameras
