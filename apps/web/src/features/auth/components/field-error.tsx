/** First form-field validation message, rendered under the input. */
export function FieldError({ errors }: { errors: Array<unknown> }) {
  const message = errors
    .map((error) =>
      typeof error === 'string'
        ? error
        : (error as { message?: string }).message,
    )
    .find(Boolean)

  if (!message) return null

  return (
    <p role="alert" className="text-sm text-red-600">
      {message}
    </p>
  )
}
