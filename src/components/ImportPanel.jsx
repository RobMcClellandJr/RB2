function ImportPanel({ onFilesLoaded, message }) {
  function handleFileChange(event) {
    const files = [...(event.target.files || [])]
    if (!files.length) return

    Promise.all(files.map(readTextFile))
      .then((loadedFiles) => onFilesLoaded(loadedFiles))
      .catch((error) => onFilesLoaded([], error))
      .finally(() => {
        event.target.value = ''
      })
  }

  return (
    <section className="panel import-panel" aria-labelledby="import-title">
      <div>
        <h2 id="import-title">Import CSV</h2>
        <p>{message}</p>
      </div>
      <label className="file-picker">
        <span>Upload CSVs</span>
        <input
          accept=".csv,text/csv"
          multiple
          type="file"
          onChange={handleFileChange}
        />
      </label>
    </section>
  )
}

function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () =>
      resolve({
        name: file.name,
        text: String(reader.result || ''),
      })
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
    reader.readAsText(file)
  })
}

export default ImportPanel
