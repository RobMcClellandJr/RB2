function ImportPanel({ onFileLoaded, message }) {
  function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => onFileLoaded(String(reader.result || ''), file.name)
    reader.onerror = () => onFileLoaded('', file.name)
    reader.readAsText(file)
  }

  return (
    <section className="panel import-panel" aria-labelledby="import-title">
      <div>
        <h2 id="import-title">Import CSV</h2>
        <p>{message}</p>
      </div>
      <label className="file-picker">
        <span>Upload CSV</span>
        <input accept=".csv,text/csv" type="file" onChange={handleFileChange} />
      </label>
    </section>
  )
}

export default ImportPanel
