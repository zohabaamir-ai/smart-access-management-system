import { useRef } from 'react'

import { Camera, Pencil } from 'lucide-react'

/* =============================================================
   PROFILE AVATAR PICKER

   Circular account photo with a hover overlay and a corner edit
   button. Owns only the hidden file input; validation stays
   with the parent, which receives the raw change event.
============================================================= */

type ProfileAvatarPickerProps = {
  imageUrl: string | null
  initials: string
  name: string
  loading: boolean
  saving: boolean
  onImageChange: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void
}

function ProfileAvatarPicker({
  imageUrl,
  initials,
  name,
  loading,
  saving,
  onImageChange,
}: ProfileAvatarPickerProps) {
  const fileInputRef =
    useRef<HTMLInputElement>(null)

  function pick() {
    fileInputRef.current?.click()
  }

  const disabled = loading || saving

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <button
          type="button"
          onClick={pick}
          disabled={disabled}
          aria-label="Change account photo"
          className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-lg font-semibold text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-slate-800 dark:text-slate-300 dark:focus-visible:ring-offset-slate-900"
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}

          <span className="absolute inset-0 flex items-center justify-center bg-slate-950/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera
              size={20}
              className="text-white"
            />
          </span>
        </button>

        <button
          type="button"
          onClick={pick}
          disabled={disabled}
          aria-label="Change account photo"
          className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 dark:border-slate-900"
        >
          <Pencil size={12} />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onImageChange}
        disabled={disabled}
        className="hidden"
      />

      <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
        {name}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-500">
        JPEG, PNG or WebP · up to 5 MB
      </p>
    </div>
  )
}

export default ProfileAvatarPicker
