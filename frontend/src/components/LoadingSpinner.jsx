export default function LoadingSpinner({ size = 'md', fullPage = false }) {
  if (fullPage) {
    return (
      <div className="full-page-spinner">
        <div className="spinner spinner-lg" />
      </div>
    )
  }

  return (
    <div className="spinner-container">
      <div className={`spinner spinner-${size}`} />
    </div>
  )
}
